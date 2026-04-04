import express from 'express';
import authRouter from './modules/api/auth/auth.routes';

//Child routers
import gatewaysRouter from './modules/api/gateways/gateways.routes';
import notificationsRouter from './modules/api/notifications/notifications.routes';
import dataRouter from './modules/collect/data/data.routes';
import telemetryRouter from './modules/api/telemetry/telemetry.routes';
import usersRouter from './modules/api/users/users.routes';


const apiRouter = express.Router();
const collectRouter = express.Router();


apiRouter.use('/auth', authRouter);
apiRouter.use('/gateways', gatewaysRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/telemetry', telemetryRouter);
apiRouter.use('/users', usersRouter);

collectRouter.use('/data', dataRouter);

export {apiRouter, collectRouter};