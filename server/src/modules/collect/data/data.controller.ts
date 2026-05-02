import type { Response } from 'express';
import type { TypedRequest } from '../../../shared/types';
import { CollectTelemetryDto } from './data.schema';

import { collectTelemetry as collectTelemetryService } from './data.service';
import { InternalServerError } from '../../../shared/errors';

export const collectTelemetry = async (req: TypedRequest<CollectTelemetryDto>, res: Response) => {
    const { gateway } = req;
    if(!gateway) throw new InternalServerError();

    await collectTelemetryService(req.body, gateway.gatewayId);

    res.status(201);
};