# Meteostation API endpoint documentation

## Assumptions and conventions

- Base path for FE API: `/api`
- Base path for data collection from gateway: `/collect/data`
- Authentication for FE API:
  - access token: short-lived JWT in `Authorization: Bearer <token>`
  - refresh token: secure httpOnly cookie or returned token value, according to implementation choice
- Gateway authentication:
  - gateway uses plain secret once configured
  - server stores only `gateway_token_hash`
  - gateway sends token in header, e.g. `X-Gateway-Token`
- Time values are ISO 8601 UTC strings
- IDs are represented as strings in JSON to avoid BIGINT precision issues in JS
- SSE endpoint returns `text/event-stream`
- Application profiles are mapped from your role profiles:
  - `Guest`
  - `Operator`
  - `Supervisor`
  - `Administrator`
  - `PlatformAdmin`

---

# 1. Auth

## 1.1 Login

**Name**  
Login

**Description**  
Authenticates invited and registered user, returns access token and refresh token/session information.

**HTTP method**  
`POST`

**URL**  
`/api/auth/login`

**Application profiles**  
Guest, Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  email: "john.doe@example.com",
  password: "Secret123!",
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});
```

**Output**

```ts
const dtoOut = {
  accessToken: "jwt-access-token",
  refreshToken: "plain-refresh-token",
  user: {
    id: "1",
    email: "john.doe@example.com",
    role: "administrator",
    nickname: "John",
    createdAt: "2026-04-04T12:30:00Z",
    registeredAt: "2026-04-04T12:30:00Z",
    updatedAt: "2026-04-04T12:30:00Z",
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(["guest", "operator", "supervisor", "administrator", "platformAdmin"]),
  nickname: z.string(),
  createdAt: z.string().datetime(),
  registeredAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const dtoOutValidationSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: userSchema,
});
```

**Sequence**
1. Validate request body.
   - `400 Bad Request` if body is invalid.
2. Load user by email.
   - `401 Unauthorized` if email does not exist.
3. Verify password hash.
   - `401 Unauthorized` if password is invalid.
4. Create access token.
5. Create refresh token, hash it, persist into `refresh_tokens`.
   - `500 Internal Server Error` if token persistence fails.
6. Return authenticated user and tokens.
   - `200 OK`

---

## 1.2 Refresh session

**Name**  
Refresh session

**Description**  
Refreshes access token using valid refresh token.

**HTTP method**  
`POST`

**URL**  
`/api/auth/refresh`

**Application profiles**  
Guest, Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  refreshToken: "plain-refresh-token",
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});
```

**Output**

```ts
const dtoOut = {
  accessToken: "new-jwt-access-token",
  refreshToken: "rotated-refresh-token",
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
```

**Sequence**
1. Validate request body.
   - `400 Bad Request`
2. Hash incoming refresh token and load matching session.
   - `401 Unauthorized` if token not found.
3. Check token not revoked and not expired.
   - `401 Unauthorized` if invalid.
4. Load user.
   - `401 Unauthorized` if related user no longer exists.
5. Revoke old refresh token and create new rotated refresh token.
   - `500 Internal Server Error` on DB failure.
6. Return new tokens.
   - `200 OK`

---

## 1.3 Logout current session

**Name**  
Logout current session

**Description**  
Revokes current refresh token/session.

**HTTP method**  
`POST`

**URL**  
`/api/auth/logout`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  refreshToken: "plain-refresh-token",
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});
```

**Output**  
No body.

**Output validation**  
Not applicable.

**Sequence**
1. Validate request body.
   - `400 Bad Request`
2. Hash refresh token and find session.
   - `204 No Content` can still be returned if token not found, to keep logout idempotent.
3. Revoke token if found.
   - `500 Internal Server Error` on DB failure.
4. Return no content.
   - `204 No Content`

---

## 1.4 Get current session

**Name**  
Get current session

**Description**  
Returns current authenticated user identity and role.

**HTTP method**  
`GET`

**URL**  
`/api/auth/me`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**  
No body.

**Input validation**  
Access token validation from auth middleware.

**Output**

```ts
const dtoOut = {
  user: {
    id: "1",
    email: "john.doe@example.com",
    role: "administrator",
    nickname: "John",
    createdAt: "2026-04-04T12:30:00Z",
    registeredAt: "2026-04-04T12:30:00Z",
    updatedAt: "2026-04-04T12:30:00Z",
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.enum(["guest", "operator", "supervisor", "administrator", "platformAdmin"]),
    nickname: z.string(),
    createdAt: z.string().datetime(),
    registeredAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
});
```

**Sequence**
1. Validate access token.
   - `401 Unauthorized` if token missing or invalid.
2. Load current user.
   - `401 Unauthorized` if user no longer exists.
3. Return user.
   - `200 OK`

---

# 2. Invites

## 2.1 Create invite

**Name**  
Create invite

**Description**  
Creates invite for a future user and generates one-time registration token.

**HTTP method**  
`POST`

**URL**  
`/api/users/invites`

**Application profiles**  
Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  email: "new.user@example.com",
  expiresAt: "2026-04-30T23:59:59Z",
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  email: z.string().trim().email().max(255),
  expiresAt: z.string().datetime(),
});
```

**Output**

```ts
const dtoOut = {
  invite: {
    id: "10",
    email: "new.user@example.com",
    invitedBy: "1",
    expiresAt: "2026-04-30T23:59:59Z",
    fulfilledAt: null,
  },
  token: "plain-invite-token",
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  invite: z.object({
    id: z.string(),
    email: z.string().email(),
    invitedBy: z.string(),
    expiresAt: z.string().datetime(),
    fulfilledAt: z.string().datetime().nullable(),
  }),
  token: z.string().min(1),
});
```

**Sequence**
1. Validate auth and role.
   - `401 Unauthorized` / `403 Forbidden`
2. Validate request body.
   - `400 Bad Request`
3. Optionally check no active user already exists for email.
   - `409 Conflict` if email already registered.
4. Generate invite token and store hash in `invites`.
   - `500 Internal Server Error` on DB failure.
5. Return invite metadata and plain token.
   - `201 Created`

---

## 2.2 Register from invite

**Name**  
Register from invite

**Description**  
Completes invite-based registration and creates user account.

**HTTP method**  
`POST`

**URL**  
`/api/auth/register-from-invite`

**Application profiles**  
Guest

**Input**

```ts
const dtoIn = {
  token: "plain-invite-token",
  password: "Secret123!",
  nickname: "Alice",
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
  nickname: z.string().trim().min(1).max(255),
});
```

**Output**

```ts
const dtoOut = {
  user: {
    id: "17",
    email: "new.user@example.com",
    role: "guest",
    nickname: "Alice",
    createdAt: "2026-04-05T09:00:00Z",
    registeredAt: "2026-04-05T09:00:00Z",
    updatedAt: "2026-04-05T09:00:00Z",
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.enum(["guest", "operator", "supervisor", "administrator", "platformAdmin"]),
    nickname: z.string(),
    createdAt: z.string().datetime(),
    registeredAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
});
```

**Sequence**
1. Validate body.
   - `400 Bad Request`
2. Hash token and load invite.
   - `404 Not Found` if invite does not exist.
3. Check invite not expired and not fulfilled.
   - `410 Gone` if expired or already used.
4. Check user with invite email does not already exist.
   - `409 Conflict`
5. Hash password and create user with default role `guest`.
6. Mark invite as fulfilled.
   - `500 Internal Server Error` on DB failure.
7. Return created user.
   - `201 Created`

---

# 3. Users

## 3.1 List users

**Name**  
List users

**Description**  
Returns users for administration.

**HTTP method**  
`GET`

**URL**  
`/api/users`

**Application profiles**  
Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  page: 1,
  pageSize: 20,
  role: "operator",
  search: "john",
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(["guest", "operator", "supervisor", "administrator", "platformAdmin"]).optional(),
  search: z.string().trim().max(255).optional(),
});
```

**Output**

```ts
const dtoOut = {
  items: [
    {
      id: "1",
      email: "john.doe@example.com",
      role: "administrator",
      nickname: "John",
      createdAt: "2026-04-04T12:30:00Z",
      registeredAt: "2026-04-04T12:30:00Z",
      updatedAt: "2026-04-04T12:30:00Z",
    },
  ],
  pageInfo: {
    page: 1,
    pageSize: 20,
    total: 1,
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const userListItemSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(["guest", "operator", "supervisor", "administrator", "platformAdmin"]),
  nickname: z.string(),
  createdAt: z.string().datetime(),
  registeredAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const dtoOutValidationSchema = z.object({
  items: z.array(userListItemSchema),
  pageInfo: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});
```

**Sequence**
1. Validate auth and role.
   - `401` / `403`
2. Validate query params.
   - `400`
3. Query users with filters and pagination.
   - `500` on DB error.
4. Return list.
   - `200 OK`

---

## 3.2 Get user detail

**Name**  
Get user detail

**Description**  
Returns one user by ID.

**HTTP method**  
`GET`

**URL**  
`/api/users/:userId`

**Application profiles**  
Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    userId: "1",
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    userId: z.string().regex(/^\d+$/),
  }),
});
```

**Output**

```ts
const dtoOut = {
  user: {
    id: "1",
    email: "john.doe@example.com",
    role: "administrator",
    nickname: "John",
    createdAt: "2026-04-04T12:30:00Z",
    registeredAt: "2026-04-04T12:30:00Z",
    updatedAt: "2026-04-04T12:30:00Z",
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.enum(["guest", "operator", "supervisor", "administrator", "platformAdmin"]),
    nickname: z.string(),
    createdAt: z.string().datetime(),
    registeredAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
});
```

**Sequence**
1. Validate auth and role.
2. Validate path params.
   - `400`
3. Load user by ID.
   - `404 Not Found` if missing.
4. Return user.
   - `200 OK`

---

## 3.3 Update user role

**Name**  
Update user role

**Description**  
Changes application role/profile of an existing user.

**HTTP method**  
`PATCH`

**URL**  
`/api/users/:userId/role`

**Application profiles**  
Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    userId: "17",
  },
  body: {
    role: "operator",
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    userId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    role: z.enum(["guest", "operator", "supervisor", "administrator", "platformAdmin"]),
  }),
});
```

**Output**

```ts
const dtoOut = {
  user: {
    id: "17",
    role: "operator",
    updatedAt: "2026-04-05T10:00:00Z",
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  user: z.object({
    id: z.string(),
    role: z.enum(["guest", "operator", "supervisor", "administrator", "platformAdmin"]),
    updatedAt: z.string().datetime(),
  }),
});
```

**Sequence**
1. Validate auth and role.
   - `401` / `403`
2. Validate params and body.
   - `400`
3. Load target user.
   - `404`
4. Enforce business rules.
   - e.g. `403 Forbidden` if Administrator tries to manage PlatformAdmin.
5. Update role and timestamp.
   - `500` on DB failure.
6. Return updated role.
   - `200 OK`

---

# 4. Gateways

## 4.1 List gateways

**Name**  
List gateways

**Description**  
Returns configured meteo stations/gateways.

**HTTP method**  
`GET`

**URL**  
`/api/gateways`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  page: 1,
  pageSize: 20,
  search: "roof",
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
});
```

**Output**

```ts
const dtoOut = {
  items: [
    {
      id: "3",
      name: "Prague Roof",
      description: "Main rooftop station",
      location: "Prague HQ",
      latitude: 50.087,
      longitude: 14.421,
      lastTelemetryReceivedAt: "2026-04-05T10:10:00Z",
      status: "online",
    },
  ],
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      location: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      lastTelemetryReceivedAt: z.string().datetime().nullable(),
      status: z.enum(["online", "offline", "unknown"]),
    })
  ),
});
```

**Sequence**
1. Validate auth.
2. Validate query.
   - `400`
3. Query gateways and join latest telemetry timestamp if available.
4. Derive status from last telemetry age.
5. Return list.
   - `200 OK`

---

## 4.2 Create gateway

**Name**  
Create gateway

**Description**  
Creates new gateway record and generates one-time secret for provisioning.

**HTTP method**  
`POST`

**URL**  
`/api/gateways`

**Application profiles**  
Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  name: "Prague Roof",
  description: "Main rooftop station",
  location: "Prague HQ",
  latitude: 50.087,
  longitude: 14.421,
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
  location: z.string().trim().min(1).max(255),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});
```

**Output**

```ts
const dtoOut = {
  gateway: {
    id: "3",
    name: "Prague Roof",
    description: "Main rooftop station",
    location: "Prague HQ",
    latitude: 50.087,
    longitude: 14.421,
  },
  secret: "plain-gateway-secret",
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  gateway: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    location: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  secret: z.string().min(1),
});
```

**Sequence**
1. Validate auth and role.
2. Validate body.
   - `400`
3. Generate gateway secret and hash.
4. Insert gateway.
   - `500` on DB failure.
5. Return gateway and plain secret.
   - `201 Created`

---

## 4.3 Get gateway detail

**Name**  
Get gateway detail

**Description**  
Returns metadata and live state of a gateway.

**HTTP method**  
`GET`

**URL**  
`/api/gateways/:gatewayId`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    gatewayId: "3",
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});
```

**Output**

```ts
const dtoOut = {
  gateway: {
    id: "3",
    name: "Prague Roof",
    description: "Main rooftop station",
    location: "Prague HQ",
    latitude: 50.087,
    longitude: 14.421,
    lastTelemetryReceivedAt: "2026-04-05T10:10:00Z",
    status: "online",
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  gateway: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    location: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    lastTelemetryReceivedAt: z.string().datetime().nullable(),
    status: z.enum(["online", "offline", "unknown"]),
  }),
});
```

**Sequence**
1. Validate auth.
2. Validate params.
   - `400`
3. Load gateway and latest telemetry.
   - `404` if missing.
4. Derive status.
5. Return detail.
   - `200 OK`

---

## 4.4 Update gateway

**Name**  
Update gateway

**Description**  
Updates gateway metadata.

**HTTP method**  
`PATCH`

**URL**  
`/api/gateways/:gatewayId`

**Application profiles**  
Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    gatewayId: "3",
  },
  body: {
    name: "Prague Roof 2",
    description: "Updated description",
    location: "Prague HQ",
    latitude: 50.087,
    longitude: 14.421,
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    location: z.string().trim().min(1).max(255).optional(),
    latitude: z.number().gte(-90).lte(90).optional(),
    longitude: z.number().gte(-180).lte(180).optional(),
  }).refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  }),
});
```

**Output**

```ts
const dtoOut = {
  gateway: {
    id: "3",
    name: "Prague Roof 2",
    description: "Updated description",
    location: "Prague HQ",
    latitude: 50.087,
    longitude: 14.421,
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  gateway: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    location: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
});
```

**Sequence**
1. Validate auth and role.
2. Validate params and body.
   - `400`
3. Load gateway.
   - `404`
4. Update fields.
   - `500` on DB failure.
5. Return gateway.
   - `200 OK`

---

## 4.5 Rotate gateway secret

**Name**  
Rotate gateway secret

**Description**  
Generates new secret for gateway and invalidates previous one.

**HTTP method**  
`POST`

**URL**  
`/api/gateways/:gatewayId/rotate-secret`

**Application profiles**  
Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    gatewayId: "3",
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});
```

**Output**

```ts
const dtoOut = {
  gatewayId: "3",
  secret: "new-plain-gateway-secret",
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  gatewayId: z.string(),
  secret: z.string().min(1),
});
```

**Sequence**
1. Validate auth and role.
2. Validate params.
   - `400`
3. Load gateway.
   - `404`
4. Generate new secret and replace stored hash.
   - `500`
5. Return new plain secret.
   - `200 OK`

---

## 4.6 Delete gateway

**Name**  
Delete gateway

**Description**  
Deletes a gateway. Related telemetry is cascade deleted by DB.

**HTTP method**  
`DELETE`

**URL**  
`/api/gateways/:gatewayId`

**Application profiles**  
Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    gatewayId: "3",
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});
```

**Output**  
No body.

**Output validation**  
Not applicable.

**Sequence**
1. Validate auth and role.
2. Validate params.
   - `400`
3. Load gateway.
   - `404`
4. Delete gateway.
   - `500`
5. Return no content.
   - `204 No Content`

---

# 5. Telemetry

## 5.1 Get current conditions

**Name**  
Get current conditions

**Description**  
Returns latest telemetry for one gateway.

**HTTP method**  
`GET`

**URL**  
`/api/telemetry/current/:gatewayId`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    gatewayId: "3",
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});
```

**Output**

```ts
const dtoOut = {
  telemetry: {
    id: "1001",
    remoteId: "987654",
    gatewayId: "3",
    measuredAtUtc: "2026-04-05T10:09:00Z",
    receivedAtUtc: "2026-04-05T10:10:00Z",
    temperature: 21.4,
    pressure: 1009.2,
    humidity: 52.1,
    lighting: 780.5,
    raindropsAmount: 0,
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const telemetrySchema = z.object({
  id: z.string(),
  remoteId: z.string(),
  gatewayId: z.string(),
  measuredAtUtc: z.string().datetime(),
  receivedAtUtc: z.string().datetime(),
  temperature: z.number(),
  pressure: z.number(),
  humidity: z.number(),
  lighting: z.number(),
  raindropsAmount: z.number().int().nonnegative(),
});

const dtoOutValidationSchema = z.object({
  telemetry: telemetrySchema,
});
```

**Sequence**
1. Validate auth.
2. Validate params.
   - `400`
3. Check gateway exists.
   - `404`
4. Load latest telemetry.
   - `404` if no telemetry yet.
5. Return latest record.
   - `200 OK`

---

## 5.2 Stream current conditions (SSE)

**Name**  
Stream current conditions

**Description**  
Server-Sent Events stream for automatic FE updates with newly received telemetry.

**HTTP method**  
`GET`

**URL**  
`/api/telemetry/stream/:gatewayId`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    gatewayId: "3",
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});
```

**Output**  
SSE stream, example event payload:

```ts
const dtoOut = {
  event: "telemetry",
  data: {
    id: "1002",
    remoteId: "987655",
    gatewayId: "3",
    measuredAtUtc: "2026-04-05T10:10:00Z",
    receivedAtUtc: "2026-04-05T10:11:00Z",
    temperature: 21.6,
    pressure: 1009.1,
    humidity: 51.8,
    lighting: 800.2,
    raindropsAmount: 0,
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  event: z.literal("telemetry"),
  data: z.object({
    id: z.string(),
    remoteId: z.string(),
    gatewayId: z.string(),
    measuredAtUtc: z.string().datetime(),
    receivedAtUtc: z.string().datetime(),
    temperature: z.number(),
    pressure: z.number(),
    humidity: z.number(),
    lighting: z.number(),
    raindropsAmount: z.number().int().nonnegative(),
  }),
});
```

**Sequence**
1. Validate auth.
   - `401`
2. Validate params.
   - `400`
3. Check gateway exists.
   - `404`
4. Set SSE headers and keep connection open.
5. Optionally send initial latest snapshot event.
6. Subscribe client to telemetry event bus for given gateway.
7. On new telemetry insert, send SSE event.
8. On client disconnect, clean up subscription.
9. Possible runtime errors:
   - close stream on internal pub/sub failure
   - optionally emit `event: error`

---

## 5.3 Get telemetry history

**Name**  
Get telemetry history

**Description**  
Returns historical telemetry for charts and tables.

**HTTP method**  
`GET`

**URL**  
`/api/telemetry/history/:gatewayId`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    gatewayId: "3",
  },
  query: {
    from: "2026-04-05T00:00:00Z",
    to: "2026-04-05T23:59:59Z",
    limit: 500,
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
  query: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    limit: z.coerce.number().int().min(1).max(5000).default(500),
  }).refine((v) => new Date(v.from) < new Date(v.to), {
    message: "from must be before to",
  }),
});
```

**Output**

```ts
const dtoOut = {
  items: [
    {
      id: "1001",
      remoteId: "987654",
      gatewayId: "3",
      measuredAtUtc: "2026-04-05T10:09:00Z",
      receivedAtUtc: "2026-04-05T10:10:00Z",
      temperature: 21.4,
      pressure: 1009.2,
      humidity: 52.1,
      lighting: 780.5,
      raindropsAmount: 0,
    },
  ],
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      remoteId: z.string(),
      gatewayId: z.string(),
      measuredAtUtc: z.string().datetime(),
      receivedAtUtc: z.string().datetime(),
      temperature: z.number(),
      pressure: z.number(),
      humidity: z.number(),
      lighting: z.number(),
      raindropsAmount: z.number().int().nonnegative(),
    })
  ),
});
```

**Sequence**
1. Validate auth.
2. Validate params and query.
   - `400`
3. Check gateway exists.
   - `404`
4. Query telemetry in time range.
   - `500` on DB error.
5. Return telemetry list.
   - `200 OK`

---

## 5.4 Get aggregated trends

**Name**  
Get aggregated trends

**Description**  
Returns bucketed telemetry aggregates for charts and simple trend visualization.

**HTTP method**  
`GET`

**URL**  
`/api/telemetry/trends/:gatewayId`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    gatewayId: "3",
  },
  query: {
    from: "2026-04-01T00:00:00Z",
    to: "2026-04-05T23:59:59Z",
    bucket: "1h",
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
  query: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    bucket: z.enum(["5m", "15m", "1h", "6h", "1d"]),
  }).refine((v) => new Date(v.from) < new Date(v.to), {
    message: "from must be before to",
  }),
});
```

**Output**

```ts
const dtoOut = {
  items: [
    {
      bucketStartUtc: "2026-04-05T10:00:00Z",
      avgTemperature: 21.5,
      avgPressure: 1009.15,
      avgHumidity: 51.95,
      avgLighting: 790.35,
      sumRaindropsAmount: 0,
    },
  ],
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  items: z.array(
    z.object({
      bucketStartUtc: z.string().datetime(),
      avgTemperature: z.number().nullable(),
      avgPressure: z.number().nullable(),
      avgHumidity: z.number().nullable(),
      avgLighting: z.number().nullable(),
      sumRaindropsAmount: z.number().int().nonnegative(),
    })
  ),
});
```

**Sequence**
1. Validate auth.
2. Validate params and query.
   - `400`
3. Check gateway exists.
   - `404`
4. Run aggregate query.
   - `500`
5. Return bucketed data.
   - `200 OK`

---

## 5.5 Get simple prediction

**Name**  
Get simple prediction

**Description**  
Returns lightweight derived prediction/trend based on recent telemetry window.

**HTTP method**  
`GET`

**URL**  
`/api/telemetry/prediction/:gatewayId`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    gatewayId: "3",
  },
  query: {
    horizonHours: 6,
    basedOnHours: 24,
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
  query: z.object({
    horizonHours: z.coerce.number().int().min(1).max(24).default(6),
    basedOnHours: z.coerce.number().int().min(6).max(168).default(24),
  }),
});
```

**Output**

```ts
const dtoOut = {
  prediction: {
    generatedAtUtc: "2026-04-05T10:15:00Z",
    horizonHours: 6,
    basedOnHours: 24,
    temperatureTrend: "stable",
    pressureTrend: "falling",
    humidityTrend: "rising",
    summary: "Pressure is falling, light rain may become more likely.",
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  prediction: z.object({
    generatedAtUtc: z.string().datetime(),
    horizonHours: z.number().int(),
    basedOnHours: z.number().int(),
    temperatureTrend: z.enum(["rising", "falling", "stable"]),
    pressureTrend: z.enum(["rising", "falling", "stable"]),
    humidityTrend: z.enum(["rising", "falling", "stable"]),
    summary: z.string(),
  }),
});
```

**Sequence**
1. Validate auth.
2. Validate params and query.
   - `400`
3. Check gateway exists.
   - `404`
4. Load recent telemetry window.
   - `404` if not enough data.
5. Compute simple trend/prediction.
6. Return result.
   - `200 OK`

---

# 6. Notifications

## 6.1 List notifications for current user

**Name**  
List notifications

**Description**  
Returns notifications visible to current user, including acknowledgement state.

**HTTP method**  
`GET`

**URL**  
`/api/notifications`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  onlyUnacknowledged: true,
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  onlyUnacknowledged: z.coerce.boolean().optional(),
});
```

**Output**

```ts
const dtoOut = {
  items: [
    {
      id: "8",
      type: "warning",
      text: "Gateway Prague Roof has not sent data for 15 minutes.",
      gatewayId: "3",
      isForAdminsOnly: false,
      acknowledged: false,
    },
  ],
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["warning", "info", "danger"]),
      text: z.string(),
      gatewayId: z.string().nullable(),
      isForAdminsOnly: z.boolean(),
      acknowledged: z.boolean(),
    })
  ),
});
```

**Sequence**
1. Validate auth.
2. Validate query.
   - `400`
3. Query notifications joined through `users_notifications` for current user.
4. Filter admin-only notifications by role.
5. Return list.
   - `200 OK`

---

## 6.2 Acknowledge notification

**Name**  
Acknowledge notification

**Description**  
Marks notification as acknowledged for current user.

**HTTP method**  
`POST`

**URL**  
`/api/notifications/:notificationId/acknowledge`

**Application profiles**  
Operator, Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  params: {
    notificationId: "8",
  },
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  params: z.object({
    notificationId: z.string().regex(/^\d+$/),
  }),
});
```

**Output**

```ts
const dtoOut = {
  notificationId: "8",
  acknowledged: true,
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  notificationId: z.string(),
  acknowledged: z.literal(true),
});
```

**Sequence**
1. Validate auth.
2. Validate params.
   - `400`
3. Check notification visible to current user.
   - `404` if not found / not visible.
4. Update `users_notifications.acknowledged`.
   - `500`
5. Return ack result.
   - `200 OK`

---

## 6.3 Create system notification

**Name**  
Create system notification

**Description**  
Creates manual notification, mainly for admins/operations.

**HTTP method**  
`POST`

**URL**  
`/api/notifications`

**Application profiles**  
Supervisor, Administrator, PlatformAdmin

**Input**

```ts
const dtoIn = {
  type: "info",
  text: "Maintenance window starts at 18:00 UTC.",
  gatewayId: null,
  isForAdminsOnly: true,
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  type: z.enum(["warning", "info", "danger"]),
  text: z.string().trim().min(1).max(5000),
  gatewayId: z.string().regex(/^\d+$/).nullable(),
  isForAdminsOnly: z.boolean(),
});
```

**Output**

```ts
const dtoOut = {
  notification: {
    id: "9",
    type: "info",
    text: "Maintenance window starts at 18:00 UTC.",
    gatewayId: null,
    isForAdminsOnly: true,
  },
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  notification: z.object({
    id: z.string(),
    type: z.enum(["warning", "info", "danger"]),
    text: z.string(),
    gatewayId: z.string().nullable(),
    isForAdminsOnly: z.boolean(),
  }),
});
```

**Sequence**
1. Validate auth and role.
2. Validate body.
   - `400`
3. If gatewayId present, verify gateway exists.
   - `404`
4. Insert notification.
5. Create `users_notifications` rows for intended recipients.
   - `500`
6. Return created notification.
   - `201 Created`

---

# 7. Data collection from gateway

## 7.1 Ingest telemetry

**Name**  
Ingest telemetry

**Description**  
Receives telemetry payload from gateway/station.

**HTTP method**  
`POST`

**URL**  
`/collect/data`

**Application profiles**  
Gateway secret only

**Input**

```ts
const dtoIn = {
  remoteId: "987654",
  measuredAtUtc: "2026-04-05T10:09:00Z",
  temperature: 21.4,
  pressure: 1009.2,
  humidity: 52.1,
  lighting: 780.5,
  raindropsAmount: 0,
};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({
  remoteId: z.string().regex(/^\d+$/),
  measuredAtUtc: z.string().datetime(),
  temperature: z.number().finite(),
  pressure: z.number().finite(),
  humidity: z.number().gte(0).lte(100),
  lighting: z.number().gte(0),
  raindropsAmount: z.number().int().nonnegative(),
});
```

**Output**

```ts
const dtoOut = {
  telemetryId: "1001",
  gatewayId: "3",
  accepted: true,
  receivedAtUtc: "2026-04-05T10:10:00Z",
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  telemetryId: z.string(),
  gatewayId: z.string(),
  accepted: z.literal(true),
  receivedAtUtc: z.string().datetime(),
});
```

**Sequence**
1. Read gateway token from header.
   - `401 Unauthorized` if missing.
2. Hash token and resolve gateway.
   - `401 Unauthorized` if invalid.
3. Validate request body.
   - `400 Bad Request`
4. Insert telemetry with `receivedAtUtc = now()`.
   - `409 Conflict` if unique `(gateway_id, measured_at_utc)` violated.
   - `500 Internal Server Error` on DB error.
5. Publish telemetry event for SSE subscribers.
6. Optionally evaluate notification rules for offline recovery / threshold warnings.
7. Return accepted response.
   - `201 Created`

---

# 8. Optional PlatformAdmin-only operational endpoints

These are optional. I would keep them only if you really want app-level operations and not infra-level operations.

## 8.1 List gateway health summary

**Name**  
List gateway health summary

**Description**  
Returns lightweight operational summary for all gateways, mainly for PlatformAdmin dashboard.

**HTTP method**  
`GET`

**URL**  
`/api/gateways/health`

**Application profiles**  
PlatformAdmin

**Input**

```ts
const dtoIn = {};
```

**Input validation**

```ts
import { z } from "zod";

const dtoInValidationSchema = z.object({});
```

**Output**

```ts
const dtoOut = {
  items: [
    {
      gatewayId: "3",
      gatewayName: "Prague Roof",
      lastTelemetryReceivedAt: "2026-04-05T10:10:00Z",
      status: "online",
      minutesSinceLastTelemetry: 1,
    },
  ],
};
```

**Output validation**

```ts
import { z } from "zod";

const dtoOutValidationSchema = z.object({
  items: z.array(
    z.object({
      gatewayId: z.string(),
      gatewayName: z.string(),
      lastTelemetryReceivedAt: z.string().datetime().nullable(),
      status: z.enum(["online", "offline", "unknown"]),
      minutesSinceLastTelemetry: z.number().int().nonnegative().nullable(),
    })
  ),
});
```

**Sequence**
1. Validate auth and role.
2. Query gateways with latest telemetry timestamps.
3. Derive health status.
4. Return list.
   - `200 OK`

---

# Suggested status derivation

For gateway live/health endpoints, define one simple rule centrally, for example:

- `online`: last telemetry received within 2 × expected publish interval
- `offline`: older than that
- `unknown`: no telemetry ever received

---

# Suggested module mapping to your structure

- `modules/api/auth`
  - login
  - refresh
  - logout
  - me
  - register-from-invite
- `modules/api/users`
  - list users
  - get user detail
  - update user role
  - create invite
- `modules/api/gateways`
  - list gateways
  - create gateway
  - get gateway detail
  - update gateway
  - rotate gateway secret
  - delete gateway
  - gateway health
- `modules/api/telemetry`
  - current
  - stream (SSE)
  - history
  - trends
  - prediction
- `modules/api/notifications`
  - list
  - acknowledge
  - create
- `modules/collect/data`
  - ingest telemetry

---

# My practical recommendation

If you want to keep the first version sane, I’d start with this minimal MVP set:

1. `POST /api/auth/login`
2. `POST /api/auth/refresh`
3. `POST /api/auth/logout`
4. `GET /api/auth/me`
5. `POST /api/auth/register-from-invite`
6. `POST /api/users/invites`
7. `GET /api/gateways`
8. `POST /api/gateways`
9. `PATCH /api/gateways/:gatewayId`
10. `POST /api/gateways/:gatewayId/rotate-secret`
11. `DELETE /api/gateways/:gatewayId`
12. `GET /api/telemetry/current/:gatewayId`
13. `GET /api/telemetry/stream/:gatewayId`
14. `GET /api/telemetry/history/:gatewayId`
15. `GET /api/telemetry/trends/:gatewayId`
16. `GET /api/notifications`
17. `POST /api/notifications/:notificationId/acknowledge`
18. `POST /collect/data`

Prediction and user admin detail endpoints can come right after that.

