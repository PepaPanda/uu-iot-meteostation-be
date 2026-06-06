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

    const {gatewayId, gatewayName, gatewayLastStatus} = gateway;

    // GW health info definition
    const currentGatewayStatus = 'online';
    const currentBatteryLevel = currentTelemetry.nodeBatteryLevel;
    const previousBatteryLevel = previousTelemetry?.nodeBatteryLevel ?? null;
    const currentWifiStrength = currentTelemetry.nodeWifiStrength;

    // GW rain
    const prevRain = previousTelemetry ? previousTelemetry.raindropsAmount : 0;
    const currentRain = currentTelemetry.raindropsAmount;


    // Gateway just went online
    if (
        currentGatewayStatus === 'online'
        && (
            gatewayLastStatus === 'offline'
            || gatewayLastStatus === 'unknown'
        )
    ) {
        await updateGateway(gatewayId, {
            lastStatus: 'online',
        });

        await createNotification({
            type: 'info',
            text: `Gateway „${gatewayName}" (ID: ${gatewayId}) je opět online.`,
            isForAdminsOnly: false,
            gatewayId,
        });
    }

    // Gateway battery is dangerously low
    if (
        typeof currentBatteryLevel === 'number'
        && currentBatteryLevel <= 20
        && typeof previousBatteryLevel === 'number'
        && previousBatteryLevel > 20
    ) {
        await createNotification({
            type: 'warning',
            text: `Gateway „${gatewayName}" (ID: ${gatewayId}) má slabou baterii (20 %).`,
            isForAdminsOnly: false,
            gatewayId,
        });
    }

     // Gateway wifi strength is low
    if (
        typeof currentWifiStrength === 'number'
        && currentWifiStrength < -75
    ) {
        await createNotificationIfNotDuplicate({
            type: 'warning',
            text: `Gateway „${gatewayName}" (ID: ${gatewayId}) má slabý signál Wi-Fi, může docházet k výpadkům telemetrie.`,
            isForAdminsOnly: false,
            gatewayId,
        });
    }

    if (prevRain === 0 && currentRain > 0) {
         await createNotification({
            type: 'info',
            text: `Gateway „${gatewayName}" právě zaznamenal dešťové srážky.`,
            isForAdminsOnly: false,
            gatewayId,
        });
    }
};

export const handlePredictionNotification = async (gateway: Gateway, prediction: SimplePredictionResponseDto) => {
    return await createNotification({
        type: 'info',
        text: `Předpověď ze stanice „${gateway.gatewayName}": ${prediction.summary}`,
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
            text: 'Tlak klesá a vlhkost stoupá – v následujících hodinách je pravděpodobnější déšť.',
            important: true
        };
    }

    if (pressureTrend === 'rising' && humidityTrend === 'falling') {
        return {
            text: 'Tlak stoupá a vlhkost klesá – počasí se v následujících hodinách může ustálit.',
            important: false
        };
    }

    if (temperatureTrend === 'rising' && pressureTrend !== 'falling') {
        return {
            text: 'Teplota stoupá a tlak neklesá – podmínky mohou v následujících hodinách zůstat stabilní.',
            important: false
        };
    }

    if (temperatureTrend === 'falling' && humidityTrend === 'rising') {
        return { 
            text: 'Teplota klesá a vlhkost stoupá – v následujících hodinách může být chladněji a vlhčeji.',
            important: true     
        };
    }

    return {
        text: 'V následujících hodinách se neočekává výrazná změna počasí.',
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