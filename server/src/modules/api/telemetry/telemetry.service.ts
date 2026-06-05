import type {
    GetTelemetryHistoryRequestDto,
    GetTelemetryTrendsRequestDto,
    SimplePredictionResponseDto,
} from './telemetry.dto';

import type { Telemetry } from './telemetry.types';

import {
    getLatestTelemetry,
    getTelemetryForPrediction,
    getTelemetryHistory,
    getTelemetryTrends
} from './telemetry.repository';

import { findGatewayById } from '../gateways/gateways.repository';
import { handleNotificationsOnTelemetryReceived, handlePredictionNotification, calculateTrend, createPredictionSummary } from './telemetry.helpers';

const SIMPLE_PREDICTION_BASED_ON_HOURS = 24;
const SIMPLE_PREDICTION_MIN_POINTS = 4;


export const getLatestTelemetryService = async (
    gatewayId: number,
): Promise<Telemetry | null> => {
    const telemetry = await getLatestTelemetry(gatewayId);

    return telemetry;
};

export const getTelemetryHistoryService = async (
    gatewayId: number,
    dto: GetTelemetryHistoryRequestDto,
): Promise<Telemetry[]> => {
    const telemetries = await getTelemetryHistory({
        gatewayId,
        from: dto.from,
        to: dto.to,
        limit: dto.limit,
    });

    return telemetries;
};

export const getTelemetryTrendsService = async (
    gatewayId: number,
    dto: GetTelemetryTrendsRequestDto,
) => {
    const buckets = await getTelemetryTrends({
        gatewayId,
        from: dto.from,
        to: dto.to,
        bucket: dto.bucket,
    });

    return buckets;
};

export const getPredictionService = async (
    gatewayId: number,
): Promise<SimplePredictionResponseDto & {important: boolean}> => {
    const to = new Date();
    const from = new Date(to.getTime() - SIMPLE_PREDICTION_BASED_ON_HOURS * 60 * 60 * 1000);

    const telemetries = await getTelemetryForPrediction({
        gatewayId,
        from: from.toISOString(),
        to: to.toISOString(),
    });

    if (telemetries.length < SIMPLE_PREDICTION_MIN_POINTS) {
        return {
            generatedAtUtc: to.toISOString(),
            temperatureTrend: 'stable',
            pressureTrend: 'stable',
            humidityTrend: 'stable',
            summary: 'Not enough telemetry data is available to calculate a reliable prediction.',
            important: false
        };
    }

    const temperatureTrend = calculateTrend(telemetries, (t) => t.temperature, 0.5);
    const pressureTrend = calculateTrend(telemetries, (t) => t.pressure, 1);
    const humidityTrend = calculateTrend(telemetries, (t) => t.humidity, 3);

    const { text, important } = createPredictionSummary(temperatureTrend, pressureTrend, humidityTrend);

    return {
        generatedAtUtc: to.toISOString(),
        temperatureTrend,
        pressureTrend,
        humidityTrend,
        summary: text,
        important
    };
};

export const evaluateTelemetryNotificationsService = async (
    gatewayId: number
): Promise<void> => {

    //Get telemetries
    const latestTelemetry = await getLatestTelemetry(gatewayId);
    const secondLatestTelemetry = await getLatestTelemetry(gatewayId, 1);
    const gateway = await findGatewayById(gatewayId);

    //get predictions
    const prediction = await getPredictionService(gatewayId);

    if(!latestTelemetry || !gateway) return console.error('gateway or telemetry not found, notification not evaluated');

    if(prediction.important) {
        await handlePredictionNotification(gateway, prediction);
    }

    await handleNotificationsOnTelemetryReceived({gateway, currentTelemetry: latestTelemetry, previousTelemetry: secondLatestTelemetry});
};