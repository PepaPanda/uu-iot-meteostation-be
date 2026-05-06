import { Response, NextFunction } from 'express';
import { TypedRequest } from '../shared/types';
import { UnauthorizedError } from '../shared/errors';

import { getGatewayByPlainToken } from '../modules/api/gateways/gateways.service';

import { getBearerToken } from '../shared/helpers/http';

export default async (req: TypedRequest<unknown>, res: Response, next: NextFunction) => {

    const token = getBearerToken(req.headers.authorization);
    const gateway = await getGatewayByPlainToken(token);

    if(!gateway) throw new UnauthorizedError('Incorrect token');

    req.gateway = gateway;

    next();
};