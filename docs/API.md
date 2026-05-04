---
layout: default
title: Meteostation API Guide
---

# Meteostation API

## Overview

Meteostation exposes two HTTP API surfaces:

- **Frontend/user API** mounted under `/api`
- **Gateway collect API** mounted under `/collect`

The backend uses **Express**, **TypeScript**, and **Zod**. Request validation is performed with Zod schemas. Most frontend endpoints are protected by a server-managed session cookie, while the gateway ingestion endpoint uses a gateway bearer secret.

The accompanying `openapi.yaml` is OpenAPI **3.0.3** and is intended to be usable in Swagger UI and by frontend developers.

## Base paths

| API surface | Base path | Purpose |
|---|---:|---|
| Frontend/user API | `/api` | Authenticated UI and user-facing operations |
| Gateway collect API | `/collect` | Gateway telemetry ingestion |

Mounted frontend routers:

```ts
apiRouter.use('/auth', authRouter);
apiRouter.use('/gateways', gatewaysRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/telemetry', telemetryRouter);
apiRouter.use('/users', usersRouter);
```

Mounted collect router:

```ts
collectRouter.use('/data', dataRouter);
```

## Authentication

### Frontend API session cookie

The frontend API uses a server-managed session cookie:

```http
Cookie: meteoSessionToken=<session-token>
```

The client does **not** manually manage the cookie value. The backend validates the cookie and may internally rotate the session approximately every 15 minutes.

Endpoints protected by frontend authentication use the `authenticate` middleware.

### Gateway collect bearer token

The collect endpoint uses a gateway bearer token:

```http
Authorization: Bearer <gateway-secret>
```

The gateway secret is created when a gateway is created or when its secret is rotated. It is visible only once.

## Roles

Frontend endpoints may additionally use role middleware:

```ts
requireUserRole('guest')
requireUserRole('operator')
requireUserRole('supervisor')
requireUserRole('administrator')
```

Role hierarchy, from lowest to highest:

```text
guest < operator < supervisor < administrator
```

A user with a higher role satisfies lower-role requirements. For example, an `administrator` can access endpoints requiring `guest`, `operator`, or `supervisor`.

## Error format

Operational application errors return JSON in this shape:

```json
{
  "error": "ErrorClassName",
  "message": "Human readable message",
  "details": {}
}
```

`details` may be omitted or undefined.

### Error classes

| Error class | HTTP status |
|---|---:|
| `BadRequestError` | 400 |
| `UnauthorizedError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `UnprocessableEntityError` | 422 |
| `InternalServerError` | 500 |

### Validation error example

```json
{
  "error": "UnprocessableEntityError",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

### Database error responses

| Case | Response body |
|---|---|
| Unique violation | `{ "message": "Resource already exists" }` |
| Foreign key violation | `{ "message": "Referenced resource does not exist" }` |
| Missing required value | `{ "message": "Missing required value" }` |
| Invalid value | `{ "message": "Invalid value" }` |
| Generic database error | `{ "message": "Database error" }` |
| Generic internal error | `{ "error": "Internal server error" }` |
| Invalid JSON body | `{ "error": "BadRequestError", "message": "invalid JSON body" }` |

## Note about GET request bodies

Some GET endpoints intentionally use request bodies through `validateBody(...)`. They are documented with `requestBody` in `openapi.yaml`, even though many APIs avoid bodies on GET requests.

These endpoints use GET request bodies intentionally:

- `GET /api/gateways`
- `GET /api/notifications`
- `GET /api/telemetry/history/:gatewayId`
- `GET /api/telemetry/trends/:gatewayId`
- `GET /api/users`

Frontend clients should send `Content-Type: application/json` when sending these bodies.

## Endpoint summary

| Method | Path | Module | Required access | Summary |
|---|---|---|---|---|
| POST | /api/auth/login | Auth | none | Log in |
| POST | /api/auth/logout | Auth | authenticated user | Log out current session |
| POST | /api/auth/logout-everywhere | Auth | authenticated user | Log out all sessions |
| GET | /api/auth/me | Auth | authenticated user | Get current user |
| POST | /api/auth/register-from-invite | Auth | none | Register from invitation |
| POST | /api/gateways/{gatewayId}/rotate-secret | Gateways | supervisor or higher | Rotate gateway secret |
| GET | /api/gateways/{gatewayId}/health | Gateways | guest or higher | Get gateway health |
| GET | /api/gateways | Gateways | guest or higher | List gateways |
| POST | /api/gateways | Gateways | operator or higher | Create gateway |
| GET | /api/gateways/{gatewayId} | Gateways | guest or higher | Get gateway |
| PATCH | /api/gateways/{gatewayId} | Gateways | operator or higher | Update gateway |
| DELETE | /api/gateways/{gatewayId} | Gateways | supervisor or higher | Delete gateway |
| GET | /api/notifications | Notifications | authenticated user | List notifications |
| POST | /api/notifications | Notifications | administrator | Create notification |
| POST | /api/notifications/{notificationId}/acknowledge | Notifications | authenticated user | Acknowledge notification |
| GET | /api/telemetry/current/{gatewayId} | Telemetry | guest or higher | Get latest telemetry |
| GET | /api/telemetry/history/{gatewayId} | Telemetry | guest or higher | Get telemetry history |
| GET | /api/telemetry/stream/{gatewayId} | Telemetry | guest or higher | Stream telemetry events |
| GET | /api/telemetry/trends/{gatewayId} | Telemetry | guest or higher | Get telemetry trends |
| GET | /api/telemetry/prediction/{gatewayId} | Telemetry | guest or higher | Get simple weather prediction |
| PATCH | /api/users/update | Users | authenticated user | Update current user |
| PATCH | /api/users/change-password | Users | authenticated user | Change current user password |
| DELETE | /api/users/{userId} | Users | administrator | Delete user |
| GET | /api/users/{userId} | Users | operator or higher | Get user |
| POST | /api/users/invite | Users | administrator | Invite user |
| GET | /api/users | Users | supervisor or higher | List users |
| PATCH | /api/users/{userId}/role | Users | administrator | Update user role |
| POST | /collect/data/send | Collect | gateway secret | Collect telemetry from gateway |


## Auth module

Base path: `/api/auth`

### `POST /api/auth/login`

Logs a user in and creates a server-managed session cookie.

Middleware:

```ts
validateBody(loginUserSchema)
requireNoActiveSession
```

Request body:

```json
{
  "email": "admin@example.com",
  "password": "correct horse battery staple"
}
```

Response: `200 LoginResponseDto`

```json
{
  "id": 1,
  "email": "admin@example.com",
  "nickname": "Admin",
  "role": "administrator"
}
```

### `POST /api/auth/logout`

Logs out the current session.

Middleware:

```ts
authenticate
```

Response: `204 No Content`

### `POST /api/auth/logout-everywhere`

Logs out all active sessions for the authenticated user.

Middleware:

```ts
authenticate
```

Response: `204 No Content`

### `GET /api/auth/me`

Returns the authenticated user's current profile information.

Middleware:

```ts
authenticate
```

Response: `200 CurrentUserInfoResponseDto`

```json
{
  "id": 1,
  "email": "admin@example.com",
  "nickname": "Admin",
  "role": "administrator",
  "createdAt": "2026-04-05T10:00:00Z",
  "updatedAt": "2026-04-05T10:00:00Z"
}
```

### `POST /api/auth/register-from-invite`

Registers a user from an invite token and returns the login DTO.

Middleware:

```ts
validateBody(registerFromInviteUserSchema)
requireNoActiveSession
```

Response: `201 LoginResponseDto`

## Gateways module

Base path: `/api/gateways`

### `GET /api/gateways`

Lists gateways.

Required role: `guest` or higher.

Middleware:

```ts
authenticate
requireUserRole('guest')
validateBody(listGatewaysSchema)
```

This GET endpoint intentionally uses a JSON request body.

Request body:

```json
{
  "page": 1,
  "pageSize": 20,
  "search": "Garden"
}
```

Response: `200 ListGatewaysResponseDto`

### `POST /api/gateways`

Creates a gateway.

Required role: `operator` or higher.

Middleware:

```ts
authenticate
requireUserRole('operator')
validateBody(createGatewaySchema)
```

Request body:

```json
{
  "name": "Garden Gateway",
  "description": "Gateway near greenhouse",
  "location": "Garden",
  "latitude": 50.0755,
  "longitude": 14.4378
}
```

Response: `201 CreateGatewayResponseDto`

```json
{
  "gateway": {
    "id": 1,
    "name": "Garden Gateway",
    "description": "Gateway near greenhouse",
    "location": "Garden",
    "latitude": 50.0755,
    "longitude": 14.4378
  },
  "secret": "gw_secret_visible_once"
}
```

The `secret` is visible only once.

### `GET /api/gateways/:gatewayId`

Gets a gateway by ID.

Required role: `guest` or higher.

Response: `200 GetGatewayResponseDto`

### `PATCH /api/gateways/:gatewayId`

Updates a gateway.

Required role: `operator` or higher.

At least one update field must be provided.

Response: `200 GetGatewayResponseDto`

### `DELETE /api/gateways/:gatewayId`

Deletes a gateway.

Required role: `supervisor` or higher.

Response: `204 No Content`

### `POST /api/gateways/:gatewayId/rotate-secret`

Rotates a gateway secret.

Required role: `supervisor` or higher.

Response: `200 RotateGatewaySecretResponseDto`

```json
{
  "secret": "gw_secret_visible_once",
  "gatewayId": 1
}
```

The rotated secret is visible only once.

### `GET /api/gateways/:gatewayId/health`

Gets gateway health.

Required role: `guest` or higher.

Response: `200 GetGatewayHealthResponseDto`

```json
{
  "gatewayId": 1,
  "status": "online",
  "lastTelemetryAtUtc": "2026-04-05T10:15:02Z",
  "nodeBatteryLevel": 87,
  "nodeWifiStrength": -62
}
```

Health status values:

```text
online | offline | unknown
```

## Notifications module

Base path: `/api/notifications`

### `GET /api/notifications`

Lists notifications.

Middleware:

```ts
authenticate
validateBody(listNotificationsSchema)
```

This GET endpoint intentionally uses a JSON request body.

Request body:

```json
{
  "onlyUnacknowledged": true
}
```

Response: `200 ListNotificationsResponseDto`

### `POST /api/notifications`

Creates a notification.

Required role: `administrator`.

Request body:

```json
{
  "type": "warning",
  "text": "Gateway 1 is offline.",
  "gatewayId": 1,
  "isForAdminsOnly": false
}
```

Response: `201 CreateNotificationResponseDto`

### `POST /api/notifications/:notificationId/acknowledge`

Acknowledges a notification.

Middleware:

```ts
authenticate
validateParams(notificationIdParamsSchema)
```

Response: `200 AcknowledgeNotificationResponseDto`

```json
{
  "id": 1,
  "acknowledged": true
}
```

Notification types:

```text
warning | info | danger
```

## Telemetry module

Base path: `/api/telemetry`

### `GET /api/telemetry/current/:gatewayId`

Returns the latest telemetry for a gateway.

Required role: `guest` or higher.

Response: `200 GetLatestTelemetryResponseDto`

```json
{
  "id": 1,
  "remoteId": 42,
  "gatewayId": 1,
  "measuredAtUtc": "2026-04-05T10:15:00Z",
  "receivedAtUtc": "2026-04-05T10:15:02Z",
  "temperature": 22.4,
  "pressure": 1012.8,
  "humidity": 54,
  "lighting": 820,
  "raindropsAmount": 0
}
```

### `GET /api/telemetry/history/:gatewayId`

Returns telemetry history for a gateway.

Required role: `guest` or higher.

This GET endpoint intentionally uses a JSON request body.

Request body:

```json
{
  "from": "2026-04-05T00:00:00Z",
  "to": "2026-04-06T00:00:00Z",
  "limit": 500
}
```

Validation rule: `from` must be before `to`.

Response: `200 GetTelemetryHistoryResponseDto`

### `GET /api/telemetry/trends/:gatewayId`

Returns telemetry trend buckets for a gateway.

Required role: `guest` or higher.

This GET endpoint intentionally uses a JSON request body.

Request body:

```json
{
  "from": "2026-04-05T00:00:00Z",
  "to": "2026-04-06T00:00:00Z",
  "bucket": "1h"
}
```

Bucket values:

```text
15m | 30m | 1h | 6h | 1d
```

Response: `200 GetTelemetryTrendsResponseDto`

```json
{
  "buckets": [
    {
      "bucketStartUtc": "2026-04-05T10:00:00Z",
      "avgTemperature": 22.1,
      "avgPressure": 1012.6,
      "avgHumidity": 55.2,
      "avgLighting": 810,
      "sumRaindropsAmount": 0
    }
  ]
}
```

### `GET /api/telemetry/prediction/:gatewayId`

Returns a simple generated prediction summary.

Required role: `guest` or higher.

Response: `200 SimplePredictionResponseDto`

```json
{
  "generatedAtUtc": "2026-04-05T10:15:00Z",
  "temperatureTrend": "stable",
  "pressureTrend": "falling",
  "humidityTrend": "rising",
  "summary": "Pressure is falling and humidity is rising, rain may become more likely in the next few hours."
}
```

Trend values:

```text
rising | falling | stable
```

### `GET /api/telemetry/stream/:gatewayId`

Streams live telemetry events through Server-Sent Events.

Required role: `guest` or higher.

Authentication: session cookie.

Response content type:

```http
Content-Type: text/event-stream
```

Events:

#### `connected`

```text
event: connected
data: {"gatewayId":1,"connectedAtUtc":"2026-04-05T10:15:00.000Z"}
```

#### `telemetry`

```text
event: telemetry
data: {"id":1,"remoteId":42,"gatewayId":1,"measuredAtUtc":"2026-04-05T10:15:00Z","receivedAtUtc":"2026-04-05T10:15:02Z","temperature":22.4,"pressure":1012.8,"humidity":54,"lighting":820,"raindropsAmount":0}
```

#### `heartbeat`

```text
event: heartbeat
data: {"timestamp":"2026-04-05T10:15:30.000Z"}
```

Frontend example:

```ts
const events = new EventSource('/api/telemetry/stream/1', {
  withCredentials: true
});

events.addEventListener('connected', (event) => {
  console.log('connected', JSON.parse(event.data));
});

events.addEventListener('telemetry', (event) => {
  console.log('telemetry', JSON.parse(event.data));
});

events.addEventListener('heartbeat', (event) => {
  console.log('heartbeat', JSON.parse(event.data));
});
```

## Users module

Base path: `/api/users`

### `PATCH /api/users/update`

Updates the authenticated user's profile.

Middleware:

```ts
authenticate
validateBody(updateUserSchema)
```

Request body:

```json
{
  "email": "admin@example.com",
  "nickname": "Admin"
}
```

Response: `200 UpdateUserResponseDto`

### `PATCH /api/users/change-password`

Changes the authenticated user's password.

Request body:

```json
{
  "password": "correct horse battery staple"
}
```

Response: `204 No Content`

### `GET /api/users`

Lists users.

Required role: `supervisor` or higher.

This GET endpoint intentionally uses a JSON request body.

Request body:

```json
{
  "page": 1,
  "pageSize": 20,
  "role": "administrator",
  "search": "Admin"
}
```

Response: `200 ListUsersResponseDto`

### `GET /api/users/:userId`

Gets a user by ID.

Required role: `operator` or higher.

Response: `200 GetUserResponseDto`

### `DELETE /api/users/:userId`

Deletes a user.

Required role: `administrator`.

Response: `204 No Content`

### `POST /api/users/invite`

Creates an invitation for a user.

Required role: `administrator`.

Request body:

```json
{
  "email": "new.user@example.com"
}
```

Response: `200 InviteUserResponseDto`

```json
{
  "invitationPlainToken": "invite_plain_token_visible_once"
}
```

### `PATCH /api/users/:userId/role`

Updates a user's role.

Required role: `administrator`.

Request body:

```json
{
  "role": "operator"
}
```

Response: `200 UpdateUserRoleResponseDto`

## Collect module

Base path: `/collect/data`

### `POST /collect/data/send`

Accepts telemetry sent by a gateway.

Authentication:

```http
Authorization: Bearer <gateway-secret>
```

Middleware:

```ts
authenticateGateway
validateBody(collectTelemetrySchema)
collectTelemetryController
```

Request body:

```json
{
  "remoteId": "42",
  "measuredAtUtc": "2026-04-05T10:15:00Z",
  "temperature": 22.4,
  "pressure": 1012.8,
  "humidity": 54,
  "lighting": 820,
  "raindropsAmount": 0,
  "nodeBatteryLevel": 87,
  "nodeWifiStrength": -62
}
```

Response: `201 No Content`

If gateway authentication fails, the API returns `401 Unauthorized`.

## Practical examples

### Login

```bash
curl -i -X POST 'http://localhost:3000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"correct horse battery staple"}'
```

The backend sets/manages the `meteoSessionToken` cookie.

### Get current user

```bash
curl -i 'http://localhost:3000/api/auth/me' \
  -H 'Cookie: meteoSessionToken=<session-token>'
```

In browsers, use credentials so the cookie is included:

```ts
const response = await fetch('/api/auth/me', {
  credentials: 'include'
});
```

### List gateways with a GET request body

```bash
curl -i -X GET 'http://localhost:3000/api/gateways' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: meteoSessionToken=<session-token>' \
  -d '{"page":1,"pageSize":20,"search":"Garden"}'
```

### Create a gateway

```bash
curl -i -X POST 'http://localhost:3000/api/gateways' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: meteoSessionToken=<session-token>' \
  -d '{"name":"Garden Gateway","description":"Gateway near greenhouse","location":"Garden","latitude":50.0755,"longitude":14.4378}'
```

### Send telemetry from gateway

```bash
curl -i -X POST 'http://localhost:3000/collect/data/send' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <gateway-secret>' \
  -d '{"remoteId":"42","measuredAtUtc":"2026-04-05T10:15:00Z","temperature":22.4,"pressure":1012.8,"humidity":54,"lighting":820,"raindropsAmount":0,"nodeBatteryLevel":87,"nodeWifiStrength":-62}'
```

### Open telemetry stream in the browser

```ts
const stream = new EventSource('/api/telemetry/stream/1', {
  withCredentials: true
});

stream.addEventListener('telemetry', (event) => {
  const telemetry = JSON.parse(event.data);
  console.log(telemetry);
});
```

## DTO reference

The full request and response schema reference is available in `openapi.yaml` under:

```yaml
components:
  schemas:
```

Use the OpenAPI file as the source of truth for field types, enum values, examples, and reusable error responses.
