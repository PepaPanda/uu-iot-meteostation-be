import { updateGatewayByIdService as updateGateway } from '../gateways/gateways.service';
import { Gateway } from '../gateways/gateways.types';
import { createNotificationService as createNotification, createNotificationIfNotDuplicate } from '../notifications/notifications.service';
import { SimplePredictionResponseDto } from './telemetry.dto';
import { Telemetry } from './telemetry.types';

import { average } from '../../../shared/helpers/utils';

export const handleNotificationsOnTelemetryReceived = async (input: {
    gateway: Gateway;
    currentTelemetry: Telemetry;
    previousTelemetry: Telemetry | null;
}): Promise<void> => {
    const {
        gateway,
        currentTelemetry,
        previousTelemetry,
    } = input;

    const gatewayId = gateway.gatewayId;
    const gatewayName = gateway.gatewayName;
    const previousGatewayStatus = gateway.gatewayLastStatus;

    const currentGatewayStatus: Gateway['gatewayLastStatus'] = 'online';

    const currentBatteryLevel = currentTelemetry.nodeBatteryLevel;
    const previousBatteryLevel = previousTelemetry?.nodeBatteryLevel ?? null;
    const currentWifiStrength = currentTelemetry.nodeWifiStrength;

    if (
        currentGatewayStatus === 'online'
        && (
            previousGatewayStatus === 'offline'
            || previousGatewayStatus === 'unknown'
        )
    ) {
        await updateGateway(gatewayId, {
            lastStatus: 'online',
        });

        await createNotification({
            type: 'info',
            text: `Gateway "${gatewayName}" (ID: ${gatewayId}) just got online`,
            isForAdminsOnly: false,
            gatewayId,
        });
    }

    if (
        typeof currentBatteryLevel === 'number'
        && currentBatteryLevel <= 20
        && typeof previousBatteryLevel === 'number'
        && previousBatteryLevel > 20
    ) {
        await createNotification({
            type: 'warning',
            text: `Gateway "${gatewayName}" (ID: ${gatewayId}) battery is getting low (20%).`,
            isForAdminsOnly: false,
            gatewayId,
        });
    }

    if (
        typeof currentWifiStrength === 'number'
        && currentWifiStrength < -75
    ) {
        await createNotificationIfNotDuplicate({
            type: 'warning',
            text: `Gateway "${gatewayName}" (ID: ${gatewayId}) wifi signal is low, you may experience telemetry outages.`,
            isForAdminsOnly: false,
            gatewayId,
        });
    }
};

export const handlePredictionNotification = async (gateway: Gateway, prediction: SimplePredictionResponseDto) => {
    return await createNotification({
        type: 'info',
        text: `Prediction from "${gateway.gatewayName}": ${prediction.summary}`,
        isForAdminsOnly: false,
        gatewayId: gateway.gatewayId,
    });
};


//Trend prediction

type Trend = 'rising' | 'falling' | 'stable';
export const createPredictionSummary = (
    temperatureTrend: Trend,
    pressureTrend: Trend,
    humidityTrend: Trend,
): {text: string, important: boolean} => {
    if (pressureTrend === 'falling' && humidityTrend === 'rising') {
        return {
            text: 'Pressure is falling and humidity is rising, rain may become more likely in the next few hours.',
            important: true
        };
    }

    if (pressureTrend === 'rising' && humidityTrend === 'falling') {
        return {
            text: 'Pressure is rising and humidity is falling, weather may become more stable in the next few hours.',
            important: false
        };
    }

    if (temperatureTrend === 'rising' && pressureTrend !== 'falling') {
        return {
            text: 'Temperature is rising and pressure is not falling, conditions may remain stable in the next few hours.',
            important: false
        };
    }

    if (temperatureTrend === 'falling' && humidityTrend === 'rising') {
        return { 
            text: 'Temperature is falling and humidity is rising, conditions may become colder and more humid in the next few hours.',
            important: true     
        };
    }

    return {
        text: 'No significant weather change is detected for the next few hours.',
        important: false
    };
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

export const calculateTrend = (
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