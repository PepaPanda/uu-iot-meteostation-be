import express from 'express';

const telemetryRouter = express.Router();

telemetryRouter.get('history/:gatewayId', (req, res) => {
    res.json({responsibility: 'get telemetry history of a given gateway', gatewayId: req.params.gatewayId, query: `from: ${req.query.from}, to: ${req.query.to}`});
});

telemetryRouter.get('current/:gatewayId', (req, res) => {
    res.json({responsibility: 'Returns latest telemetry for one gateway', gatewayId: req.params.gatewayId, query: `from: ${req.query.from}, to: ${req.query.to}`});
});

telemetryRouter.get('stream/:gatewayId', (req, res) => {
    res.json({responsibility: 'Server-Sent Events stream for automatic FE updates with newly received telemetry.', gatewayId: req.params.gatewayId, query: `from: ${req.query.from}, to: ${req.query.to}`});
});

telemetryRouter.get('trends/:gatewayId', (req, res) => {
    res.json({responsibility: 'Returns bucketed telemetry aggregates for charts and simple trend visualization.'});
});

telemetryRouter.get('prediction/:gatewayId', (req, res) => {
    res.json({responsibility: 'Returns lightweight derived prediction/trend based on recent telemetry window.'});
});



export default telemetryRouter;