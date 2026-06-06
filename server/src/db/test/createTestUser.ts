import { dbPool } from '../pool';
import argon2 from 'argon2';

(async () => {
    const HASH = await argon2.hash('password123');
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
        $1,
        $2,
        $3,
        $4,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT ("user_email") DO NOTHING;`;

    const users = [
        {
            email: 'admin@meteotrack.cz',
            passwordHash: HASH,
            role: 'administrator',
            nickname: 'Some Admin'
        },
        {
            email: 'supervisor@meteotrack.cz',
            passwordHash: HASH,
            role: 'supervisor',
            nickname: 'Some Supervisor'
        },
        {
            email: 'operator@meteotrack.cz',
            passwordHash: HASH,
            role: 'operator',
            nickname: 'Some Operator'
        },
        {
            email: 'guest@meteotrack.cz',
            passwordHash: HASH,
            role: 'guest',
            nickname: 'Some Guest'
        },
    ];

    try {
        await Promise.all(
            users.map(user =>
                dbPool.query(dbQuery, [user.email, user.passwordHash, user.role, user.nickname])
            )
        );
        console.log(`Ensured ${users.length} test users exist.`);
    } finally {
        await dbPool.end();
    }
})();
