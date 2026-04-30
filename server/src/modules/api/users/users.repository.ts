import { dbPool } from '../../../db/pool';
import type { User, Email } from '../users/users.schema';
import { getFirstRow } from '../../../db/helpers';
import ms from 'ms';

import type { Invitation } from '../auth/auth.schema';


const userSelect = `
  user_id AS "userId",
  user_email AS "userEmail",
  user_password_hash AS "userPasswordHash",
  user_role AS "userRole",
  user_nickname AS "userNickname",
  user_created_at AS "userCreatedAt",
  user_updated_at AS "userUpdatedAt"
`;



export const findUserByEmail = async (email: Email): Promise<User> => {
    const result = await dbPool.query(`SELECT ${userSelect} FROM users WHERE user_email = $1 LIMIT 1`, [email]);
    return getFirstRow(result);
};

export const createInvitation = async (
  email: Email,
  tokenHash: string,
  invitedByUserId: number,
): Promise<boolean> => {
  const expiresInMs = ms('3d');
  const expiresAt = new Date(Date.now() + expiresInMs);

  const result = await dbPool.query(
    `INSERT INTO "invites" (
      "invite_email",
      "invite_token_hash",
      "invite_invited_by",
      "invite_expires_at",
      "invite_fulfilled_at"
    )
    SELECT
      $1,
      $2,
      $3,
      $4,
      NULL
    WHERE NOT EXISTS (
      SELECT 1
      FROM "users"
      WHERE "user_email" = $1
    )`,
    [email, tokenHash, invitedByUserId, expiresAt],
  );

  return result.rowCount === 1;
};

export const findInvitationByHashedToken = async (
  tokenHash: string,
): Promise<Invitation | null> => {
  const result = await dbPool.query<Invitation>(
    `SELECT
        invite_id AS "inviteId",
        invite_email AS "email",
        invite_token_hash AS "tokenHash",
        invite_invited_by AS "invitedBy",
        invite_expires_at AS "expiresAt",
        invite_fulfilled_at AS "fulfilledAt"
     FROM "invites"
     WHERE invite_token_hash = $1
     LIMIT 1`,
    [tokenHash],
  );

  return getFirstRow(result);
};

export const fulfillInvitation = async (
  inviteId: number,
): Promise<void> => {
  await dbPool.query(
    `UPDATE "invites"
     SET "invite_fulfilled_at" = NOW()
     WHERE "invite_id" = $1
       AND "invite_fulfilled_at" IS NULL`,
    [inviteId],
  );
};

export const createUser = async (
  email: User['userEmail'],
  passwordHash: User['userPasswordHash'],
  nickname: User['userNickname'],
  role: User['userRole'] = 'guest',
): Promise<User> => {
  const result = await dbPool.query<User>(
    `INSERT INTO "users" (
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
    RETURNING
      user_id AS "userId",
      user_email AS "email",
      user_password_hash AS "passwordHash",
      user_role AS "role",
      user_nickname AS "nickname",
      user_created_at AS "createdAt",
      user_registered_at AS "registeredAt",
      user_updated_at AS "updatedAt"`,
    [email, passwordHash, role, nickname],
  );

  return getFirstRow(result);
};