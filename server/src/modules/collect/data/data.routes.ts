import express from 'express';
import { validateBody } from '../../../middleware/validateBody';
import { collectTelemetrySchema } from './data.schema';
import authenticateGateway from '../../../middleware/authenticateGateway';
import { collectTelemetry as collectTelemetryController } from './data.controller';

const dataRouter = express.Router();

dataRouter.post('/send', authenticateGateway, validateBody(collectTelemetrySchema), collectTelemetryController);


export default dataRouter;