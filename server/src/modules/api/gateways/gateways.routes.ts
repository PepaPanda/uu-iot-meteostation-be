import express from 'express';

import requireUserRole from '../../../middleware/requireUserRole';
import { validateBody } from '../../../middleware/validateBody';
import authenticate from '../../../middleware/authenticate';
import { createGatewaySchema } from './gateways.schema';
import { createGateway as createGatewayController } from './gatteways.controller';

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

gatewaysRouter.post('/', authenticate, requireUserRole('operator'), validateBody(createGatewaySchema), createGatewayController);

gatewaysRouter.delete('/:gatewayId', (req, res) => {
  res.send('Deletes a gateway. Related telemetry is cascade deleted by DB.');
});


gatewaysRouter.post(':gatewayId/rotate-secret', (req, res) => {
  res.send('Generates new secret for gateway and invalidates previous one.');
});

export default gatewaysRouter;