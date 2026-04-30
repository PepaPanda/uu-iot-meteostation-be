import { dbPool } from '../pool';
import argon2 from 'argon2';

const dbQuery = `INSERT INTO "users" (
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
    $1,
    'administrator',
    'Test User',
    NOW(),
    NOW(),
    NOW()
);`;

const create = async () => {
    const hash = await argon2.hash('password123');
    console.log(hash);
    dbPool.query(dbQuery, [hash]);
};

create();