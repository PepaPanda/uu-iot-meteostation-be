import express from 'express';
import { validateBody } from '../../../middleware/validateBody';
import { collectTelemetrySchema } from '../../../shared/zodSchemas';
const dataRouter = express.Router();

dataRouter.post('/send', validateBody(collectTelemetrySchema), (req, res) => {
    res.json({responsibility: 'collect data from gw and save it. Send SSE to all opened frontends', body: req.body, headers: req.headers});
});


export default dataRouter;