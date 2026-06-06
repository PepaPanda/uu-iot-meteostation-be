import z from 'zod/v3';

import { getTelemetryHistorySchema, getTrendsSchema } from './telemetry.schema';
import type { Telemetry } from './telemetry.types';
import { toIsoString } from '../../../shared/helpers/utils';

//Body
export type GetTelemetryHistoryRequestDto = z.infer<typeof getTelemetryHistorySchema>;
export type GetTelemetryTrendsRequestDto = z.infer<typeof getTrendsSchema>;

//Params
//for Gateway ID use value from gateways.dto.ts

//Response DTos
export type GetLatestTelemetryResponseDto = {
    id: number;
    remoteId: number;
    gatewayId: number;
    measuredAtUtc: string;
    receivedAtUtc: string;
    temperature: number;
    pressure: number;
    humidity: number;
    lighting: number;
    raindropsAmount: number;
}

export type GetTelemetryHistoryResponseDto = {
    telemetries: GetLatestTelemetryResponseDto[];
}

export type Bucket = {
    bucketStartUtc: string;
    avgTemperature: number;
    avgPressure: number;
    avgHumidity: number;
    avgLighting: number;
    sumRaindropsAmount: number;
}

export type GetTelemetryTrendsResponseDto = {
    buckets: Bucket[];
}

type Trend = 'rising' | 'falling' | 'stable';

export type SimplePredictionResponseDto = {
  generatedAtUtc: string;
  temperatureTrend: Trend;
  pressureTrend: Trend;
  humidityTrend: Trend;
  summary: string;
};

// Response DTO conversion methods

export const toGetLatestTelemetryResponseDto = (
    telemetry: Telemetry,
): GetLatestTelemetryResponseDto => {
    return {
        id: telemetry.id,
        remoteId: telemetry.remoteId,
        gatewayId: telemetry.gatewayId,
        measuredAtUtc: toIsoString(telemetry.measuredAtUtc),
        receivedAtUtc: toIsoString(telemetry.receivedAtUtc),
        temperature: telemetry.temperature,
        pressure: telemetry.pressure,
        humidity: telemetry.humidity,
        lighting: telemetry.lighting,
        raindropsAmount: telemetry.raindropsAmount,
    };
};

export const toGetTelemetryHistoryResponseDto = (
    telemetries: Telemetry[],
): GetTelemetryHistoryResponseDto => {
    return {
        telemetries: telemetries.map((t) => toGetLatestTelemetryResponseDto(t)),
    };
};

export const toGetTelemetryTrendsResponseDto = (
    buckets: Bucket[],
): GetTelemetryTrendsResponseDto => {
    return {
        buckets,
    };
};

export const toSimplePredictionResponseDto = (
    prediction: SimplePredictionResponseDto,
): SimplePredictionResponseDto => {
    return prediction;
};