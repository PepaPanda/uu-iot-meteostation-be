import z from 'zod/v3';

import { listNotificationsSchema, createNotificationSchema, notificationIdParamsSchema } from './notifications.schema';

import type { Notification } from './notifications.type';

// Body
export type ListNotificationsRequestDto = z.infer<typeof listNotificationsSchema>;
export type CreateNotificationRequestDto = z.infer<typeof createNotificationSchema>;

// Params
export type NotificationIdRequestParamsDto = z.infer<typeof notificationIdParamsSchema>;

// Response DTOs
export type NotificationResponseDto = {
  id: number;
  text: string;
  type: CreateNotificationRequestDto['type'];
  gatewayId: number | null;
  isForAdminsOnly: boolean;
  acknowledged: boolean;
};

export type ListNotificationsResponseDto = {
  notifications: NotificationResponseDto[];
};

export type CreateNotificationResponseDto = Omit<NotificationResponseDto, 'acknowledged'>;

export type AcknowledgeNotificationResponseDto = Pick<NotificationResponseDto, 'id' | 'acknowledged'>;

// Response DTOs conversion methods

export const toListNotificationsResponseDto = (notifications: Notification[]): ListNotificationsResponseDto => {
    return { notifications: notifications.map(n => ({
        id: n.id,
        text: n.text,
        type: n.type,
        gatewayId: n.gatewayId,
        isForAdminsOnly: n.isForAdminsOnly,
        acknowledged: n.acknowledged
    }))};
};

export const toCreateNotificationResponseDto = (n: Omit<Notification, 'acknowledged'>): CreateNotificationResponseDto => {
    return {
        type: n.type,
        text: n.text,
        gatewayId: n.gatewayId,
        isForAdminsOnly: n.isForAdminsOnly,
        id: n.id,
    };
};

export const toAcknowledgeNotificationResponseDto = (n: Pick<Notification, 'id' | 'acknowledged'>): AcknowledgeNotificationResponseDto => {
    return {
        id: n.id,
        acknowledged: n.acknowledged,
    };
};