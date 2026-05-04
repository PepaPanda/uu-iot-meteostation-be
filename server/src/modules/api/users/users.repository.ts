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

// ---

export type UpdateUserInput = {
  user_email?: string;
  user_nickname?: string;
};

export type UpdateUserRoleInput = {
  user_role: User['userRole'];
};

export type ChangeUserPasswordInput = {
  user_password_hash: string;
};

export type ListUsersInput = {
  page: number;
  pageSize: number;
  role?: User['userRole'];
  search?: string;
};

export type ListUsersResult = {
  users: User[];
  totalCount: number;
};

export const updateUser = async (
  userId: number,
  data: UpdateUserInput,
): Promise<User | null> => {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return null;
  }

  const setSql = entries
    .map(([column], index) => `"${column}" = $${index + 1}`)
    .join(', ');

  const values = entries.map(([, value]) => value);

  const result = await dbPool.query<User>(
    `
      UPDATE "users"
      SET ${setSql},
          "user_updated_at" = NOW()
      WHERE "user_id" = $${values.length + 1}
      RETURNING
        "user_id" AS "userId",
        "user_email" AS "userEmail",
        "user_role" AS "userRole",
        "user_nickname" AS "userNickname",
        "user_created_at" AS "userCreatedAt",
        "user_registered_at" AS "userRegisteredAt",
        "user_updated_at" AS "userUpdatedAt"
    `,
    [...values, userId],
  );

  return getFirstRow(result);
};

export const updateUserPassword = async (
  userId: number,
  data: ChangeUserPasswordInput,
): Promise<Pick<User, 'userId' | 'userUpdatedAt'> | null> => {
  const result = await dbPool.query<Pick<User, 'userId' | 'userUpdatedAt'>>(
    `
      UPDATE "users"
      SET "user_password_hash" = $1,
          "user_updated_at" = NOW()
      WHERE "user_id" = $2
      RETURNING
        "user_id" AS "userId",
        "user_updated_at" AS "userUpdatedAt"
    `,
    [data.user_password_hash, userId],
  );

  return getFirstRow(result);
};

export const deleteUser = async (
  userId: number,
): Promise<User | null> => {
  const result = await dbPool.query<User>(
    `
      DELETE FROM "users"
      WHERE "user_id" = $1
      RETURNING
        "user_id" AS "userId",
        "user_email" AS "userEmail",
        "user_role" AS "userRole",
        "user_nickname" AS "userNickname",
        "user_created_at" AS "userCreatedAt",
        "user_registered_at" AS "userRegisteredAt",
        "user_updated_at" AS "userUpdatedAt"
    `,
    [userId],
  );

  return getFirstRow(result);
};

export const listUsers = async (
  input: ListUsersInput,
): Promise<ListUsersResult> => {
  const offset = (input.page - 1) * input.pageSize;

  const whereSql: string[] = [];
  const values: unknown[] = [];

  if (input.role !== undefined) {
    values.push(input.role);
    whereSql.push(`"user_role" = $${values.length}`);
  }

  if (input.search !== undefined && input.search !== '') {
    values.push(`%${input.search}%`);
    whereSql.push(`(
      "user_email" ILIKE $${values.length}
      OR "user_nickname" ILIKE $${values.length}
    )`);
  }

  values.push(input.pageSize);
  const limitParamIndex = values.length;

  values.push(offset);
  const offsetParamIndex = values.length;

  const result = await dbPool.query<User & { totalCount: string }>(
    `
      SELECT
        "user_id" AS "userId",
        "user_email" AS "userEmail",
        "user_role" AS "userRole",
        "user_nickname" AS "userNickname",
        "user_created_at" AS "userCreatedAt",
        "user_registered_at" AS "userRegisteredAt",
        "user_updated_at" AS "userUpdatedAt",
        COUNT(*) OVER() AS "totalCount"
      FROM "users"
      ${whereSql.length > 0 ? `WHERE ${whereSql.join(' AND ')}` : ''}
      ORDER BY "user_id" ASC
      LIMIT $${limitParamIndex}
      OFFSET $${offsetParamIndex}
    `,
    values,
  );

  const totalCount = result.rows.length > 0
    ? Number(result.rows[0].totalCount)
    : 0;

  return {
    users: result.rows,
    totalCount,
  };
};

export const updateUserRole = async (
  userId: number,
  data: UpdateUserRoleInput,
): Promise<Pick<User, 'userId' | 'userRole' | 'userUpdatedAt'> | null> => {
  const result = await dbPool.query<Pick<User, 'userId' | 'userRole' | 'userUpdatedAt'>>(
    `
      UPDATE "users"
      SET "user_role" = $1,
          "user_updated_at" = NOW()
      WHERE "user_id" = $2
      RETURNING
        "user_id" AS "userId",
        "user_role" AS "userRole",
        "user_updated_at" AS "userUpdatedAt"
    `,
    [data.user_role, userId],
  );

  return getFirstRow(result);
};