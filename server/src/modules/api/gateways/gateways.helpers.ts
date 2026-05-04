import crypto from 'crypto';
import type { GatewayHealthStatus } from './gateways.dto';

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