import type { Response } from 'express';
import type { TypedRequest } from '../../../shared/types';
import { CollectTelemetryDto, CollectHistoricalTelemetriesDto } from './data.schema';

import { collectTelemetry as collectTelemetryService, collectHistoricalTelemetry as collectHistoricalTelemetryService } from './data.service';
import { InternalServerError } from '../../../shared/errors';

export const collectTelemetry = async (req: TypedRequest<CollectTelemetryDto>, res: Response) => {
    const { gateway } = req;
    if(!gateway) throw new InternalServerError();
    await collectTelemetryService(req.body, gateway.gatewayId);
    res.status(201).send();
};

export const collectHistoricalTelemetries = async (req: TypedRequest<CollectHistoricalTelemetriesDto>, res: Response) => {
    const { gateway } = req;
    if(!gateway) throw new InternalServerError();
    await collectHistoricalTelemetryService(req.body.records, gateway.gatewayId);
    res.status(201).send();
};