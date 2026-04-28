import express from 'express';

const gatewaysRouter = express.Router();

gatewaysRouter.get('/', (req, res) => {
  res.send('Returns configured meteo stations/gateways.');
});

gatewaysRouter.get('/:gatewayId', (req, res) => {
  res.send('Returns a specific gateway.');
});

gatewaysRouter.patch('/:gatewayId', (req, res) => {
  res.send('edit a specific gateway');
});

gatewaysRouter.post('/', (req, res) => {
  res.send('add a new router to the list, should return a unique token that will be visible only temporarily for the client. This token will be inserted manually to the gateway config.');
});

gatewaysRouter.delete('/:gatewayId', (req, res) => {
  res.send('Deletes a gateway. Related telemetry is cascade deleted by DB.');
});


gatewaysRouter.post(':gatewayId/rotate-secret', (req, res) => {
  res.send('Generates new secret for gateway and invalidates previous one.');
});

export default gatewaysRouter;