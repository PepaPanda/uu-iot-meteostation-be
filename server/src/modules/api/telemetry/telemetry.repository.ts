import { dbPool } from '../../../db/pool';

import { getFirstRow } from '../../../db/helpers';
import type { Telemetry } from './telemetry.types';
import type { Bucket } from './telemetry.dto';


export type GetTelemetryHistoryInput = {
    gatewayId: number;
    from: string;
    to: string;
    limit: number;
};

export type GetTelemetryTrendsInput = {
    gatewayId: number;
    from: string;
    to: string;
    bucket: '15m' | '30m' | '1h' | '6h' | '1d';
};

export type GetPredictionInput = {
    gatewayId: number;
    from: string;
    to: string;
};

const telemetrySelectSql = `
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
`;

export const getLatestTelemetry = async (
    gatewayId: number,
): Promise<Telemetry | null> => {
    const result = await dbPool.query<Telemetry>(
        `
            SELECT
                ${telemetrySelectSql}
            FROM "telemetries"
            WHERE "telemetry_gateway_id" = $1
            ORDER BY "telemetry_measured_at_utc" DESC
            LIMIT 1
        `,
        [gatewayId],
    );

    return getFirstRow(result);
};

export const getTelemetryHistory = async (
    input: GetTelemetryHistoryInput,
): Promise<Telemetry[]> => {
    const result = await dbPool.query<Telemetry>(
        `
            SELECT
                ${telemetrySelectSql}
            FROM "telemetries"
            WHERE "telemetry_gateway_id" = $1
              AND "telemetry_measured_at_utc" >= $2
              AND "telemetry_measured_at_utc" <= $3
            ORDER BY "telemetry_measured_at_utc" ASC
            LIMIT $4
        `,
        [input.gatewayId, input.from, input.to, input.limit],
    );

    return result.rows;
};

const bucketToSqlInterval = (bucket: GetTelemetryTrendsInput['bucket']): string => {
    switch (bucket) {
        case '15m':
            return '15 minutes';
        case '30m':
            return '30 minutes';
        case '1h':
            return '1 hour';
        case '6h':
            return '6 hours';
        case '1d':
            return '1 day';
    }
};

export const getTelemetryTrends = async (
    input: GetTelemetryTrendsInput,
): Promise<Bucket[]> => {
    const bucketInterval = bucketToSqlInterval(input.bucket);

    const result = await dbPool.query<Bucket>(
        `
            SELECT
                time_bucket($4::interval, "telemetry_measured_at_utc") AS "bucketStartUtc",
                AVG("telemetry_temperature")::double precision AS "avgTemperature",
                AVG("telemetry_pressure")::double precision AS "avgPressure",
                AVG("telemetry_humidity")::double precision AS "avgHumidity",
                AVG("telemetry_lighting")::double precision AS "avgLighting",
                COALESCE(SUM("telemetry_raindrops_amount"), 0)::bigint AS "sumRaindropsAmount"
            FROM "telemetries"
            WHERE "telemetry_gateway_id" = $1
              AND "telemetry_measured_at_utc" >= $2
              AND "telemetry_measured_at_utc" <= $3
            GROUP BY "bucketStartUtc"
            ORDER BY "bucketStartUtc" ASC
        `,
        [input.gatewayId, input.from, input.to, bucketInterval],
    );

    return result.rows.map((row) => ({
        ...row,
        bucketStartUtc: String(row.bucketStartUtc),
        sumRaindropsAmount: Number(row.sumRaindropsAmount),
    }));
};

export const getTelemetryForPrediction = async (
    input: GetPredictionInput,
): Promise<Telemetry[]> => {
    const result = await dbPool.query<Telemetry>(
        `
            SELECT
                ${telemetrySelectSql}
            FROM "telemetries"
            WHERE "telemetry_gateway_id" = $1
              AND "telemetry_measured_at_utc" >= $2
              AND "telemetry_measured_at_utc" <= $3
            ORDER BY "telemetry_measured_at_utc" ASC
        `,
        [input.gatewayId, input.from, input.to],
    );

    return result.rows;
};