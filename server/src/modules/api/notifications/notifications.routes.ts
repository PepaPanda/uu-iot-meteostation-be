import express from 'express';

const notificationsRouter = express.Router();

import authenticate from '../../../middleware/authenticate';
import { validateBody } from '../../../middleware/validateBody';
import { validateParams } from '../../../middleware/validateParams';
import requireUserRole from '../../../middleware/requireUserRole';

import { listNotificationsController, createNotificationController, acknowledgeNotificationController } from './notifications.controller';
import { listNotificationsSchema, createNotificationSchema, notificationIdParamsSchema } from './notifications.schema';

notificationsRouter.post(
  '/list',
  authenticate,
  validateBody(listNotificationsSchema),
  listNotificationsController,
);

notificationsRouter.post(
  '/',
  authenticate,
  requireUserRole('administrator'),
  validateBody(createNotificationSchema),
  createNotificationController,
);

notificationsRouter.post(
  '/:notificationId/acknowledge',
  authenticate,
  validateParams(notificationIdParamsSchema),
  acknowledgeNotificationController,
);

export default notificationsRouter;