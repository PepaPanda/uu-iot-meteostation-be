import type { Response } from 'express';

import type { TypedRequest } from '../../../shared/types';
import { InternalServerError, NotFoundError } from '../../../shared/errors';

import type {
  CreateNotificationRequestDto,
  ListNotificationsRequestDto,
  NotificationIdRequestParamsDto,
} from './notifications.dto';

import {
  toAcknowledgeNotificationResponseDto,
  toCreateNotificationResponseDto,
  toListNotificationsResponseDto,
} from './notifications.dto';

import {
  acknowledgeNotificationService,
  createNotificationService,
  listNotificationsService,
} from './notifications.service';

export const listNotificationsController = async (
  req: TypedRequest<ListNotificationsRequestDto>,
  res: Response,
) => {
  if(!req.session) throw new InternalServerError(); //Possibly used without auth
  const notifications = await listNotificationsService(req.session.userId, req.body);

  res.json(toListNotificationsResponseDto(notifications));
};

export const createNotificationController = async (
  req: TypedRequest<CreateNotificationRequestDto>,
  res: Response,
) => {
  const notification = await createNotificationService(req.body);

  res.status(201).json(toCreateNotificationResponseDto(notification));
};

export const acknowledgeNotificationController = async (
  req: TypedRequest<unknown, NotificationIdRequestParamsDto>,
  res: Response,
) => {
  if(!req.session) throw new InternalServerError(); //Possibly used without auth
  const notification = await acknowledgeNotificationService(
    parseInt(req.params.notificationId),
    req.session.userId,
  );

  if (!notification) throw new NotFoundError('Notification not found');

  res.json(toAcknowledgeNotificationResponseDto(notification));
};