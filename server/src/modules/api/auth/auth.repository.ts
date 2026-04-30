import { dbPool } from '../../../db/pool';

import type { Session } from './auth.schema';
import { getFirstRow } from '../../../db/helpers';

import env from '../../../env';

import ms from 'ms';



export const createUserSession = async (
  userId: number,
  sessionTokenHash: string,
): Promise<void> => {
  const expiresInMs = ms(env.SESSION_MAX_AGE);
  const expiresAt = new Date(Date.now() + expiresInMs);

  await dbPool.query(
    `INSERT INTO "user_sessions" (
      "session_user_id",
      "session_token_hash",
      "session_token_rotated_at",
      "session_expires_at",
      "session_created_at",
      "session_revoked_at"
    )
    VALUES (
      $1,
      $2,
      NOW(),
      $3,
      NOW(),
      NULL
    )`,
    [userId, sessionTokenHash, expiresAt],
  );
};

export const findUserSessionByHashedToken = async (
  tokenHash: string,
): Promise<Session | null> => {
  const result = await dbPool.query<Session>(
    `SELECT
        session_id AS "sessionId",
        session_user_id AS "userId",
        session_token_hash AS "tokenHash",
        session_token_rotated_at AS "rotatedAt",
        session_expires_at AS "expiresAt",
        session_created_at AS "createdAt",
        session_revoked_at AS "revokedAt"
     FROM "user_sessions"
     WHERE session_token_hash = $1
     LIMIT 1`,
    [tokenHash],
  );

  return getFirstRow(result);
};

export const revokeUserSessionByHashedToken = async (
  tokenHash: string,
): Promise<void> => {
  await dbPool.query(
    `UPDATE "user_sessions"
     SET "session_revoked_at" = NOW()
     WHERE "session_token_hash" = $1
       AND "session_revoked_at" IS NULL`,
    [tokenHash],
  );
};

export const rotateUserSessionToken = async (
  sessionId: number,
  oldTokenHash: string,
  newTokenHash: string,
): Promise<void> => {
  await dbPool.query(
    `UPDATE "user_sessions"
     SET
       "session_token_hash" = $1,
       "session_token_rotated_at" = NOW()
     WHERE "session_id" = $2
       AND "session_token_hash" = $3
       AND "session_revoked_at" IS NULL`,
    [newTokenHash, sessionId, oldTokenHash],
  );
};