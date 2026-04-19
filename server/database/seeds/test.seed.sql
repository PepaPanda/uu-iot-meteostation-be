-- =========================
-- USERS
-- =========================
INSERT INTO "users" (
    "user_email",
    "user_password_hash",
    "user_role",
    "user_nickname",
    "user_created_at",
    "user_registered_at",
    "user_updated_at"
) VALUES
(
    'admin@example.com',
    'hash_platform_admin',
    'platformAdmin',
    'platform-admin',
    NOW(),
    NOW(),
    NOW()
),
(
    'administrator@example.com',
    'hash_administrator',
    'administrator',
    'administrator',
    NOW(),
    NOW(),
    NOW()
),
(
    'operator@example.com',
    'hash_operator',
    'operator',
    'operator-1',
    NOW(),
    NOW(),
    NOW()
),
(
    'guest@example.com',
    'hash_guest',
    'guest',
    'guest-1',
    NOW(),
    NOW(),
    NOW()
);

-- =========================
-- GATEWAYS
-- =========================
INSERT INTO "gateways" (
    "gateway_token_hash",
    "gateway_description",
    "gateway_name",
    "gateway_location",
    "gateway_latitude",
    "gateway_longitude"
) VALUES
(
    'hash_gateway_prague',
    'Main weather gateway for Prague station',
    'gateway-prague',
    'Prague, CZ',
    50.075500,
    14.437800
),
(
    'hash_gateway_brno',
    'Secondary weather gateway for Brno station',
    'gateway-brno',
    'Brno, CZ',
    49.195100,
    16.606800
);

-- =========================
-- TELEMETRIES
-- unique over (telemetry_gateway_id, telemetry_measured_at_utc)
-- =========================
INSERT INTO "telemetries" (
    "telemetry_remote_id",
    "telemetry_gateway_id",
    "telemetry_measured_at_utc",
    "telemetry_received_at_utc",
    "telemetry_temperature",
    "telemetry_pressure",
    "telemetry_humidity",
    "telemetry_lighting",
    "telemetry_raindrops_amount"
) VALUES
(
    10001,
    1,
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '29 minutes 50 seconds',
    21.4,
    1012.8,
    58.2,
    420.0,
    0
),
(
    10002,
    1,
    NOW() - INTERVAL '20 minutes',
    NOW() - INTERVAL '19 minutes 52 seconds',
    21.8,
    1012.5,
    57.4,
    460.0,
    0
),
(
    10003,
    1,
    NOW() - INTERVAL '10 minutes',
    NOW() - INTERVAL '9 minutes 55 seconds',
    22.1,
    1012.2,
    56.8,
    510.0,
    1
),
(
    20001,
    2,
    NOW() - INTERVAL '25 minutes',
    NOW() - INTERVAL '24 minutes 48 seconds',
    19.7,
    1013.1,
    63.5,
    380.0,
    2
),
(
    20002,
    2,
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '14 minutes 49 seconds',
    20.0,
    1012.9,
    62.1,
    405.0,
    0
),
(
    20003,
    2,
    NOW() - INTERVAL '5 minutes',
    NOW() - INTERVAL '4 minutes 51 seconds',
    20.3,
    1012.6,
    61.0,
    430.0,
    0
);

-- =========================
-- NOTIFICATIONS
-- =========================
INSERT INTO "notifications" (
    "notification_is_for_admins_only",
    "notification_text",
    "notification_type",
    "notification_gateway_id"
) VALUES
(
    TRUE,
    'Gateway Prague reported unstable pressure trend.',
    'warning',
    1
),
(
    FALSE,
    'Gateway Brno is online and sending telemetry.',
    'info',
    2
),
(
    FALSE,
    'Rainfall threshold exceeded on Prague gateway.',
    'danger',
    1
),
(
    TRUE,
    'System maintenance window scheduled for tonight.',
    'info',
    NULL
);

-- =========================
-- USERS_NOTIFICATIONS
-- composite PK (notification_id, user_id)
-- =========================
INSERT INTO "users_notifications" (
    "notification_id",
    "user_id",
    "acknowledged"
) VALUES
(1, 1, TRUE),
(1, 2, FALSE),
(2, 1, TRUE),
(2, 2, TRUE),
(2, 3, FALSE),
(2, 4, FALSE),
(3, 1, FALSE),
(3, 2, FALSE),
(4, 1, FALSE),
(4, 2, FALSE);

-- =========================
-- REFRESH TOKENS
-- refresh_token_value_hash must be unique
-- =========================
INSERT INTO "refresh_tokens" (
    "refresh_token_user_id",
    "refresh_token_value_hash",
    "refresh_token_expires_at",
    "refresh_token_created_at",
    "refresh_token_revoked_at"
) VALUES
(
    1,
    'hash_refresh_token_user_1',
    NOW() + INTERVAL '30 days',
    NOW(),
    NULL
),
(
    2,
    'hash_refresh_token_user_2',
    NOW() + INTERVAL '30 days',
    NOW(),
    NULL
),
(
    3,
    'hash_refresh_token_user_3_revoked',
    NOW() + INTERVAL '30 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
);

-- =========================
-- INVITES
-- =========================
INSERT INTO "invites" (
    "invite_email",
    "invite_token_hash",
    "invite_invited_by",
    "invite_expires_at",
    "invite_fulfilled_at"
) VALUES
(
    'new.operator@example.com',
    'hash_invite_operator',
    1,
    NOW() + INTERVAL '7 days',
    NULL
),
(
    'future.supervisor@example.com',
    'hash_invite_supervisor',
    2,
    NOW() + INTERVAL '3 days',
    NULL
);