import { dbPool } from '../../../db/pool';
import type { User } from '../users/users.types';
import { getFirstRow } from '../../../db/helpers';
import ms from 'ms';

import type { Invitation } from './users.types';

const userSelect = ({password = false}: {password?: boolean}) => {
  return `
  user_id AS "userId",
  user_email AS "userEmail",
  ${password ? 'user_password_hash AS "userPasswordHash",' : ''}
  user_role AS "userRole",
  user_nickname AS "userNickname",
  user_created_at AS "userCreatedAt",
  user_updated_at AS "userUpdatedAt"`;  
};


type UserQueryOptions = { includePassword?: boolean };
const userQueryOptionsDefault = { includePassword: false };

export const findUserByEmail = async (email: string, options: UserQueryOptions = userQueryOptionsDefault): Promise<User | null> => {
    const result = await dbPool.query(`SELECT ${userSelect({password: options.includePassword})} FROM users WHERE user_email = $1 LIMIT 1`, [email]);
    return getFirstRow(result);
};

export const findUserById = async (id: User['userId'], options: UserQueryOptions = userQueryOptionsDefault): Promise<User | null> => {
    const result = await dbPool.query(`SELECT ${userSelect({password: options.includePassword})} FROM users WHERE user_id = $1 LIMIT 1`, [id]);
    return getFirstRow(result);
};

export const createInvitation = async (
  email: string,
  tokenHash: string,
  invitedByUserId: number,
): Promise<boolean> => {
  const expiresInMs = ms('3d');
  const expiresAt = new Date(Date.now() + expiresInMs);

  const client = await dbPool.connect();
  try {
      await client.query('BEGIN');

      const existingUserResult = await client.query(
        `
          SELECT 1
          FROM "users"
          WHERE "user_email" = $1
          LIMIT 1
        `,
      [email],
    );

    if (existingUserResult.rowCount === 1) {
      await client.query('ROLLBACK');
      return false;
    }

      await client.query(
        `
          UPDATE "invites"
          SET "invite_expires_at" = NOW()
          WHERE "invite_email" = $1
            AND "invite_fulfilled_at" IS NULL
            AND "invite_expires_at" > NOW()
        `,
        [email],
      );

      const result = await client.query(
        `
          INSERT INTO "invites" (
            "invite_email",
            "invite_token_hash",
            "invite_invited_by",
            "invite_expires_at",
            "invite_fulfilled_at"
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            NULL
          )
        `,
        [email, tokenHash, invitedByUserId, expiresAt],
      );

      await client.query('COMMIT');

      return result.rowCount === 1;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

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
): Promise<User | null> => {
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
      user_role AS "role",
      user_nickname AS "nickname",
      user_created_at AS "createdAt",
      user_registered_at AS "registeredAt",
      user_updated_at AS "updatedAt"`,
    [email, passwordHash, role, nickname],
  );

  return getFirstRow(result);
};