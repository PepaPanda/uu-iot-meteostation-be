import type {
  CreateNotificationRequestDto,
  ListNotificationsRequestDto,
} from './notifications.dto';

import type { Notification } from './notifications.type';
import type { User } from '../users/users.types';

import {
  acknowledgeNotification,
  assignNotificationToTargetUsers,
  assignNotificationToOneUser,
  createNotification,
  listNotifications,
  existsRecentDuplicateNotification,
  type CreateNotificationInput,
} from './notifications.repository';

export const listNotificationsService = async (
  userId: User['userId'],
  dto: ListNotificationsRequestDto,
): Promise<Notification[]> => {
  const notifications = await listNotifications({
    userId,
    onlyUnacknowledged: dto.onlyUnacknowledged,
  });

  return notifications;
};

export const createNotificationService = async (
  dto: CreateNotificationRequestDto,
): Promise<Omit<Notification, 'acknowledged'>> => {
  const createdNotification = await createNotification({
    type: dto.type,
    text: dto.text,
    gatewayId: dto.gatewayId ? dto.gatewayId : null,
    isForAdminsOnly: dto.isForAdminsOnly,
  });

  await assignNotificationToTargetUsers(
    createdNotification.id,
    createdNotification.isForAdminsOnly,
  );

  return createdNotification;
};

export const createNotificationForOneUserService = async (
  dto: Omit<CreateNotificationRequestDto, 'isForAdminsOnly'> & {userId: number}
): Promise<Omit<Notification, 'acknowledged'>> => {
  const createdNotification = await createNotification({
    type: dto.type,
    text: dto.text,
    gatewayId: dto.gatewayId ? dto.gatewayId : null,
    isForAdminsOnly: false
  });

  await assignNotificationToOneUser(
    createdNotification.id,
    dto.userId,
  );

  return createdNotification;
};

export const createNotificationIfNotDuplicate = async (
  input: CreateNotificationInput,
): Promise<Omit<Notification, 'acknowledged'> | null> => {
  const duplicateExists = await existsRecentDuplicateNotification({
    type: input.type,
    text: input.text,
    gatewayId: input.gatewayId,
  });

  if (duplicateExists) {
    return null;
  }

  const notification = await createNotification(input);

  await assignNotificationToTargetUsers(
    notification.id,
    input.isForAdminsOnly,
  );

  return notification;
};

export const acknowledgeNotificationService = async (
  notificationId: Notification['id'],
  userId: User['userId'],
): Promise<Pick<Notification, 'id' | 'acknowledged'> | null> => {
  const acknowledgedNotification = await acknowledgeNotification({
    notificationId,
    userId,
  });

  return acknowledgedNotification;
};