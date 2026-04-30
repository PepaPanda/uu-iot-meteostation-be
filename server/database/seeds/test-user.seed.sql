INSERT INTO "users" (
    "user_email",
    "user_password_hash",
    "user_role",
    "user_nickname",
    "user_created_at",
    "user_registered_at",
    "user_updated_at"
)
VALUES (
    'test@example.com',
    '$2b$10$qV0h8xV6YwqL2E9Ks63GjeZ3Neh3qFvIY.oh3G81gIlGsnlQ.59X2',
    'administrator',
    'Test User',
    NOW(),
    NOW(),
    NOW()
);