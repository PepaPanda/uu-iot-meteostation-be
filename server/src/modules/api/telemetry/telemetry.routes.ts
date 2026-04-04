import express from 'express';

const telemetryRouter = express.Router();

telemetryRouter.get('/list', (req, res) => {
    res.json({responsibility: 'get list of all current gateways telemetries'});
});

telemetryRouter.get('/list/history/:gatewayId', (req, res) => {
    res.json({responsibility: 'get telemetry history of a given gateway', gatewayId: req.params.gatewayId, query: `from: ${req.query.from}, to: ${req.query.to}`});
});


export default telemetryRouter;