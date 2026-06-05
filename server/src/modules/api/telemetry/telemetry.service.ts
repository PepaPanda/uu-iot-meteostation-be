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
import { handleNotificationsOnTelemetryReceived, handlePredictionNotification, shouldReadPrediction } from './telemetry.helpers';

const SIMPLE_PREDICTION_BASED_ON_HOURS = 24;
const SIMPLE_PREDICTION_MIN_POINTS = 4;

type Trend = 'rising' | 'falling' | 'stable';

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

const average = (values: number[]): number => {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const resolveTrend = (
    firstHalfAverage: number,
    secondHalfAverage: number,
    stableThreshold: number,
): Trend => {
    const diff = secondHalfAverage - firstHalfAverage;

    if (Math.abs(diff) <= stableThreshold) {
        return 'stable';
    }

    return diff > 0 ? 'rising' : 'falling';
};

const calculateTrend = (
    telemetries: Telemetry[],
    selector: (telemetry: Telemetry) => number,
    stableThreshold: number,
): Trend => {
    const middleIndex = Math.floor(telemetries.length / 2);

    const firstHalf = telemetries.slice(0, middleIndex);
    const secondHalf = telemetries.slice(middleIndex);

    const firstHalfAverage = average(firstHalf.map(selector));
    const secondHalfAverage = average(secondHalf.map(selector));

    return resolveTrend(firstHalfAverage, secondHalfAverage, stableThreshold);
};

const createPredictionSummary = (
    temperatureTrend: Trend,
    pressureTrend: Trend,
    humidityTrend: Trend,
): string => {
    if (pressureTrend === 'falling' && humidityTrend === 'rising') {
        return 'Pressure is falling and humidity is rising, rain may become more likely in the next few hours.';
    }

    if (pressureTrend === 'rising' && humidityTrend === 'falling') {
        return 'Pressure is rising and humidity is falling, weather may become more stable in the next few hours.';
    }

    if (temperatureTrend === 'rising' && pressureTrend !== 'falling') {
        return 'Temperature is rising and pressure is not falling, conditions may remain stable in the next few hours.';
    }

    if (temperatureTrend === 'falling' && humidityTrend === 'rising') {
        return 'Temperature is falling and humidity is rising, conditions may become colder and more humid in the next few hours.';
    }

    return 'No significant weather change is detected for the next few hours.';
};

export const getPredictionService = async (
    gatewayId: number,
): Promise<SimplePredictionResponseDto> => {
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
        };
    }

    const temperatureTrend = calculateTrend(telemetries, (t) => t.temperature, 0.5);
    const pressureTrend = calculateTrend(telemetries, (t) => t.pressure, 1);
    const humidityTrend = calculateTrend(telemetries, (t) => t.humidity, 3);

    return {
        generatedAtUtc: to.toISOString(),
        temperatureTrend,
        pressureTrend,
        humidityTrend,
        summary: createPredictionSummary(temperatureTrend, pressureTrend, humidityTrend),
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

    if(shouldReadPrediction(prediction)) {
        await handlePredictionNotification(gateway, prediction);
    }

    await handleNotificationsOnTelemetryReceived({gateway, currentTelemetry: latestTelemetry, previousTelemetry: secondLatestTelemetry});
};