import { updateGatewayByIdService as updateGateway } from '../gateways/gateways.service';
import { Gateway } from '../gateways/gateways.types';
import { createNotificationService as createNotification, createNotificationIfNotDuplicate } from '../notifications/notifications.service';
import { SimplePredictionResponseDto } from './telemetry.dto';
import { Telemetry } from './telemetry.types';

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

export const shouldReadPrediction = (prediction: SimplePredictionResponseDto) => {
    return prediction.humidityTrend !== 'stable' || prediction.pressureTrend !== 'stable' || prediction.temperatureTrend !== 'stable';
};