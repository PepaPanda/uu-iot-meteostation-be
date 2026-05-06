import { dbPool } from '../../../db/pool';
import type { CollectTelemetryDto } from './data.schema';
import type { Telemetry } from '../../api/telemetry/telemetry.types';

export const createTelemetry = async (
  telemetry: CollectTelemetryDto,
  gatewayId: number,
): Promise<Telemetry> => {
  const result = await dbPool.query<Telemetry>(
    `
      INSERT INTO "telemetries" (
        "telemetry_remote_id",
        "telemetry_gateway_id",
        "telemetry_measured_at_utc",
        "telemetry_received_at_utc",
        "telemetry_temperature",
        "telemetry_pressure",
        "telemetry_humidity",
        "telemetry_lighting",
        "telemetry_raindrops_amount",
        "telemetry_node_battery_level",
        "telemetry_node_wifi_strength"
      )
      VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        "telemetry_id" AS "id",
        "telemetry_remote_id" AS "remoteId",
        "telemetry_gateway_id" AS "gatewayId",
        "telemetry_measured_at_utc" AS "measuredAtUtc",
        "telemetry_received_at_utc" AS "receivedAtUtc",
        "telemetry_temperature" AS "temperature",
        "telemetry_pressure" AS "pressure",
        "telemetry_humidity" AS "humidity",
        "telemetry_lighting" AS "lighting",
        "telemetry_raindrops_amount" AS "raindropsAmount",
        "telemetry_node_battery_level" AS "nodeBatteryLevel",
        "telemetry_node_wifi_strength" AS "nodeWifiStrength"
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

  return result.rows[0];
};

export const createMultipleTelemetries = async (
  telemetries: CollectTelemetryDto[],
  gatewayId: number,
): Promise<void> => {
  if (telemetries.length === 0) {
    return;
  }

  const values = telemetries.flatMap((telemetry) => [
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
  ]);

  const placeholders = telemetries
    .map((_, index) => {
      const offset = index * 10;

      return `(
        $${offset + 1},
        $${offset + 2},
        $${offset + 3},
        NOW(),
        $${offset + 4},
        $${offset + 5},
        $${offset + 6},
        $${offset + 7},
        $${offset + 8},
        $${offset + 9},
        $${offset + 10}
      )`;
    })
    .join(', ');

  await dbPool.query(
    `
      INSERT INTO "telemetries" (
        "telemetry_remote_id",
        "telemetry_gateway_id",
        "telemetry_measured_at_utc",
        "telemetry_received_at_utc",
        "telemetry_temperature",
        "telemetry_pressure",
        "telemetry_humidity",
        "telemetry_lighting",
        "telemetry_raindrops_amount",
        "telemetry_node_battery_level",
        "telemetry_node_wifi_strength"
      )
      VALUES ${placeholders}
    `,
    values,
  );
};