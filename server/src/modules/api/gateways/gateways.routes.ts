import express from 'express';

import requireUserRole from '../../../middleware/requireUserRole';
import { validateBody } from '../../../middleware/validateBody';
import authenticate from '../../../middleware/authenticate';
import { createGatewaySchema, listGatewaysSchema, updateGatewaySchema, gatewayIdParamsSchema } from './gateways.schema';
import { createGateway as createGatewayController, listGateways as listGatewaysController, getGateway as getGatewayController, updateGateway as updateGatewayController, deleteGateway as deleteGatewayController, rotateGatewaySecret as rotateGatewaySecretController, getGatewayHealthController } from './gatteways.controller';
import { validateParams } from '../../../middleware/validateParams';

const gatewaysRouter = express.Router();

gatewaysRouter.post('/:gatewayId/rotate-secret', authenticate, requireUserRole('supervisor'), validateParams(gatewayIdParamsSchema), rotateGatewaySecretController);

gatewaysRouter.get('/:gatewayId/health', authenticate, requireUserRole('guest'), validateParams(gatewayIdParamsSchema), getGatewayHealthController);

gatewaysRouter.post('/list', authenticate, requireUserRole('guest'), validateBody(listGatewaysSchema), listGatewaysController);

gatewaysRouter.get('/:gatewayId', authenticate, requireUserRole('guest'), validateParams(gatewayIdParamsSchema), getGatewayController);

gatewaysRouter.patch('/:gatewayId', authenticate, requireUserRole('operator'), validateBody(updateGatewaySchema), validateParams(gatewayIdParamsSchema), updateGatewayController);

gatewaysRouter.post('/', authenticate, requireUserRole('operator'), validateBody(createGatewaySchema), createGatewayController);

gatewaysRouter.delete('/:gatewayId', authenticate, requireUserRole('supervisor'), validateParams(gatewayIdParamsSchema), deleteGatewayController);



export default gatewaysRouter;