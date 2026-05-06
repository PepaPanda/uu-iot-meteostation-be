import express from 'express';
import { validateBody } from '../../../middleware/validateBody';
import { collectTelemetrySchema, collectHistoricalTelemetriesSchema } from './data.schema';
import authenticateGateway from '../../../middleware/authenticateGateway';
import { collectTelemetry as collectTelemetryController, collectHistoricalTelemetries as collectHistoricalTelemetriesController } from './data.controller';

const dataRouter = express.Router();

dataRouter.post('/send', authenticateGateway, validateBody(collectTelemetrySchema), collectTelemetryController);

dataRouter.post('/send-history', authenticateGateway, validateBody(collectHistoricalTelemetriesSchema), collectHistoricalTelemetriesController);

export default dataRouter;