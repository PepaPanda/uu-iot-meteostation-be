import express from 'express';

import authenticate from '../../../middleware/authenticate';
import requireUserRole from '../../../middleware/requireUserRole';
import { validateBody } from '../../../middleware/validateBody';
import { validateParams } from '../../../middleware/validateParams';
import { getTelemetryHistorySchema, getTrendsSchema } from './telemetry.schema';
import { gatewayIdParamsSchema } from '../gateways/gateways.schema';

import { getLatestTelemetryController, getTelemetryHistoryController, getTrendsController, getPredictionController, streamTelemetryController } from './telemetry.controller';

const telemetryRouter = express.Router();

// Returns latest telemetry for one gateway.
telemetryRouter.get('/current/:gatewayId', authenticate, requireUserRole('guest'), validateParams(gatewayIdParamsSchema), getLatestTelemetryController);

// Returns historical telemetry for charts and tables.
telemetryRouter.get('/history/:gatewayId', authenticate, requireUserRole('guest'), validateParams(gatewayIdParamsSchema), validateBody(getTelemetryHistorySchema), getTelemetryHistoryController);

//Pro teď IGNORUJ SSE endpoint (Server-Sent Events stream for automatic FE updates with newly received telemetry.)
telemetryRouter.get('/stream/:gatewayId', authenticate, requireUserRole('guest'), validateParams(gatewayIdParamsSchema), streamTelemetryController);

// Returns bucketed telemetry aggregates for charts and simple trend visualization.
telemetryRouter.get('/trends/:gatewayId', authenticate, requireUserRole('guest'), validateParams(gatewayIdParamsSchema), validateBody(getTrendsSchema), getTrendsController);

// Returns lightweight derived prediction/trend based on recent telemetry window.
telemetryRouter.get('/prediction/:gatewayId', authenticate, requireUserRole('guest'), validateParams(gatewayIdParamsSchema), getPredictionController);

export default telemetryRouter;