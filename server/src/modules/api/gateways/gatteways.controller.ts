import type { TypedRequest } from '../../../shared/types';
import type { Response } from 'express';
import type { CreateGatewayRequestDto } from './gateways.schema';

import { InternalServerError } from '../../../shared/errors';

import { createGateway as createGatewayService } from './gateways.service';

export const createGateway = async (req: TypedRequest<CreateGatewayRequestDto>, res: Response) => {
    const gw = await createGatewayService(req.body);

    if(!gw) throw new InternalServerError();

    res.json({gateway: gw.gateway, secret: gw.gatewayToken});
};