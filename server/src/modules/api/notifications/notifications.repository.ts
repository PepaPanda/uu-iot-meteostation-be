import { dbPool } from '../../../db/pool';
import { getFirstRow } from '../../../db/helpers';
import type { Notification } from './notifications.type';

export type ListNotificationsInput = {
  userId: number;
  onlyUnacknowledged?: boolean;
};

export type CreateNotificationInput = {
  type: Notification['type'];
  text: string;
  gatewayId: number | null;
  isForAdminsOnly: boolean;
};

export type AcknowledgeNotificationInput = {
  notificationId: number;
  userId: number;
};

const notificationSelectSql = `
  n."notification_id" AS "id",
  n."notification_text" AS "text",
  n."notification_type" AS "type",
  n."notification_gateway_id" AS "gatewayId",
  n."notification_is_for_admins_only" AS "isForAdminsOnly",
  un."acknowledged" AS "acknowledged"
`;

export const listNotifications = async (
  input: ListNotificationsInput,
): Promise<Notification[]> => {
  const values: unknown[] = [input.userId];

  console.log(values);

  const whereSql = [
    'un."user_id" = $1',
  ];

  if (input.onlyUnacknowledged === true) {
    whereSql.push('un."acknowledged" IS NOT TRUE');
  }

  const query = `
      SELECT
        ${notificationSelectSql}
      FROM "notifications" n
      INNER JOIN "users_notifications" un
        ON un."notification_id" = n."notification_id"
      WHERE ${whereSql.join(' AND ')}
      ORDER BY n."notification_id" DESC
    `;

  const result = await dbPool.query<Notification>(
    query,
    values,
  );

  return result.rows;
};

export const createNotification = async (
  input: CreateNotificationInput,
): Promise<Omit<Notification, 'acknowledged'>> => {
  const result = await dbPool.query<Omit<Notification, 'acknowledged'>>(
    `
      INSERT INTO "notifications" (
        "notification_type",
        "notification_text",
        "notification_gateway_id",
        "notification_is_for_admins_only"
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        "notification_id" AS "id",
        "notification_text" AS "text",
        "notification_type" AS "type",
        "notification_gateway_id" AS "gatewayId",
        "notification_is_for_admins_only" AS "isForAdminsOnly"
    `,
    [
      input.type,
      input.text,
      input.gatewayId,
      input.isForAdminsOnly,
    ],
  );

  return result.rows[0];
};

export const assignNotificationToTargetUsers = async (
  notificationId: number,
  isForAdminsOnly: boolean,
): Promise<void> => {
  await dbPool.query(
    `
      INSERT INTO "users_notifications" (
        "notification_id",
        "user_id",
        "acknowledged"
      )
      SELECT
        $1,
        "user_id",
        false
      FROM "users"
      WHERE $2 = false
         OR "user_role" = 'administrator'
    `,
    [notificationId, isForAdminsOnly],
  );
};

export const acknowledgeNotification = async (
  input: AcknowledgeNotificationInput,
): Promise<Pick<Notification, 'id' | 'acknowledged'> | null> => {
  const result = await dbPool.query<Pick<Notification, 'id' | 'acknowledged'>>(
    `
      UPDATE "users_notifications"
      SET "acknowledged" = true
      WHERE "notification_id" = $1
        AND "user_id" = $2
      RETURNING
        "notification_id" AS "id",
        "acknowledged" AS "acknowledged"
    `,
    [input.notificationId, input.userId],
  );

  return getFirstRow(result);
};