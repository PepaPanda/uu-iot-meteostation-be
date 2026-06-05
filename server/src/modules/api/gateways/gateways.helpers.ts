import crypto from 'crypto';
import type { GatewayHealthStatus } from './gateways.dto';

import { updateGateway } from './gateways.repository';
import { createNotificationService as createNotification, createNotificationIfNotDuplicate } from '../notifications/notifications.service';


export const hashGatewayToken = (gatewayToken: string): string => {
  return crypto.createHash('sha256').update(gatewayToken).digest('hex');
};

export const generateNewGatewayToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const GATEWAY_OFFLINE_AFTER_MINUTES = 120;
export const resolveGatewayHealthStatus = (
    lastTelemetryAtUtc: Date | null,
): GatewayHealthStatus => {
    if (!lastTelemetryAtUtc) {
        return 'unknown';
    }

    const lastTelemetryTime = lastTelemetryAtUtc.getTime();
    const offlineThresholdTime = Date.now() - GATEWAY_OFFLINE_AFTER_MINUTES * 60 * 1000;

    return lastTelemetryTime >= offlineThresholdTime ? 'online' : 'offline';
};


export const handleGatewayHealthNotifications = async (input: {
    gatewayId: number;
    gatewayName: string;
    previousGatewayStatus: 'online' | 'offline' | 'unknown';
    currentGatewayStatus: 'online' | 'offline' | 'unknown';
    currentBatteryLevel: number | null;
    previousBatteryLevel: number | null;
    currentWifiStrength: number | null;
}): Promise<void> => {
    const {
        gatewayId,
        gatewayName,
        previousGatewayStatus,
        currentGatewayStatus,
        currentBatteryLevel,
        previousBatteryLevel,
        currentWifiStrength,
    } = input;

    if (
        currentGatewayStatus === 'offline'
        && previousGatewayStatus === 'online'
    ) {
        await updateGateway(gatewayId, {
            gateway_last_status: 'offline',
        });

        await createNotification({
            type: 'danger',
            text: `Gateway "${gatewayName}" (ID: ${gatewayId}) went offline`,
            isForAdminsOnly: false,
            gatewayId,
        });
    }

    if (
        currentGatewayStatus === 'online'
        && (
            previousGatewayStatus === 'offline'
            || previousGatewayStatus === 'unknown'
        )
    ) {
        await updateGateway(gatewayId, {
            gateway_last_status: 'online',
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

