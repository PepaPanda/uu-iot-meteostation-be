import { dbPool } from '../../../db/pool';
import type { CollectTelemetryDto } from './data.schema';

export const createTelemetry = async (
  telemetry: CollectTelemetryDto,
  gatewayId: number,
): Promise<void> => {
  await dbPool.query(
    `
      INSERT INTO telemetries (
        telemetry_remote_id,
        telemetry_gateway_id,
        telemetry_measured_at_utc,
        telemetry_received_at_utc,
        telemetry_temperature,
        telemetry_pressure,
        telemetry_humidity,
        telemetry_lighting,
        telemetry_raindrops_amount,
        telemetry_node_battery_level,
        telemetry_node_wifi_strength
      )
      VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      telemetry.remoteId,
      gatewayId,
      telemetry.measuredAtUtc,
      telemetry.temperature,
      telemetry.pressure,
      telemetry.humidity,
      telemetry.lighting,
      telemetry.raindropsAmount,
      telemetry.nodeBatteryLevel ?? null,
      telemetry.nodeWifiStrength ?? null,
    ],
  );
};