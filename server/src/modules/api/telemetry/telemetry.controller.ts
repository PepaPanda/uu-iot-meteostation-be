import type { Response } from 'express';

import type { TypedRequest } from '../../../shared/types';
import { NotFoundError } from '../../../shared/errors';

import type { GatewayIdRequestParamsDto } from '../gateways/gateways.dto';

import type {
    GetTelemetryHistoryRequestDto,
    GetTelemetryTrendsRequestDto,
} from './telemetry.dto';

import {
    toGetLatestTelemetryResponseDto,
    toGetTelemetryHistoryResponseDto,
    toGetTelemetryTrendsResponseDto,
    toSimplePredictionResponseDto,
} from './telemetry.dto';

import {
    getLatestTelemetryService,
    getPredictionService,
    getTelemetryHistoryService,
    getTelemetryTrendsService,
} from './telemetry.service';

import {
    addTelemetrySseClient,
    emitTelemetrySseHeartbeat,
    removeTelemetrySseClient,
} from './telemetry.sse';

export const getLatestTelemetryController = async (
    req: TypedRequest<unknown, GatewayIdRequestParamsDto>,
    res: Response,
) => {
    const telemetry = await getLatestTelemetryService(parseInt(req.params.gatewayId));

    if (!telemetry) throw new NotFoundError('Telemetry not found');

    res.json(toGetLatestTelemetryResponseDto(telemetry));
};

export const getTelemetryHistoryController = async (
    req: TypedRequest<GetTelemetryHistoryRequestDto, GatewayIdRequestParamsDto>,
    res: Response,
) => {
    const telemetries = await getTelemetryHistoryService(parseInt(req.params.gatewayId), req.body);

    res.json(toGetTelemetryHistoryResponseDto(telemetries));
};

export const getTrendsController = async (
    req: TypedRequest<GetTelemetryTrendsRequestDto, GatewayIdRequestParamsDto>,
    res: Response,
) => {
    const buckets = await getTelemetryTrendsService(parseInt(req.params.gatewayId), req.body);

    res.json(toGetTelemetryTrendsResponseDto(buckets));
};

export const getPredictionController = async (
    req: TypedRequest<unknown, GatewayIdRequestParamsDto>,
    res: Response,
) => {
    const prediction = await getPredictionService(parseInt(req.params.gatewayId));

    res.json(toSimplePredictionResponseDto(prediction));
};

export const streamTelemetryController = async (
    req: TypedRequest<unknown, GatewayIdRequestParamsDto>,
    res: Response,
) => {
    const gatewayId = parseInt(req.params.gatewayId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.flushHeaders();

    const clientId = addTelemetrySseClient(gatewayId, res);

    res.write('event: connected\n');
    res.write(`data: ${JSON.stringify({ gatewayId, connectedAtUtc: new Date().toISOString() })}\n\n`);

    const heartbeatInterval = setInterval(() => {
        emitTelemetrySseHeartbeat(clientId);
    }, 30000);

    req.on('close', () => {
        clearInterval(heartbeatInterval);
        removeTelemetrySseClient(clientId);
        res.end();
    });
};