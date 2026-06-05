import { dbPool } from '../../../db/pool';
import { getFirstRow } from '../../../db/helpers';
import type { Gateway } from './gateways.types';


type GatewayQueryOptions = { includeTokenHash?: boolean };
const gatewayQueryOptionsDefault = { includeTokenHash: false };


const gatewaySelect = (options: GatewayQueryOptions) => {
  return `
        gateway_id AS "gatewayId",
        ${options.includeTokenHash === true ? 'gateway_token_hash AS "gatewayTokenHash",' : ''}
        gateway_description AS "gatewayDescription",
        gateway_name AS "gatewayName",
        gateway_location AS "gatewayLocation",
        gateway_latitude AS "gatewayLatitude",
        gateway_longitude AS "gatewayLongitude",
        gateway_last_status AS "gatewayLastStatus"`;
};

export const findGatewayById = async (
  gatewayId: number,
  options: GatewayQueryOptions = gatewayQueryOptionsDefault
): Promise<Gateway | null> => {
  const result = await dbPool.query<Gateway>(
    `
      SELECT
        ${gatewaySelect(options)}
      FROM gateways
      WHERE gateway_id = $1
      LIMIT 1
    `,
    [gatewayId],
  );

  return getFirstRow(result);
};

export const findGatewayByTokenHash = async (
  gatewayTokenHash: string,
  options: GatewayQueryOptions = gatewayQueryOptionsDefault
): Promise<Gateway | null> => {
  const result = await dbPool.query<Gateway>(
    `
      SELECT
        ${gatewaySelect(options)}
      FROM gateways
      WHERE gateway_token_hash = $1
      LIMIT 1
    `,
    [gatewayTokenHash],
  );

  return getFirstRow(result);
};

export const createGateway = async (
  gatewayName: string,
  gatewayTokenHash: string,
  gatewayDescription: string | null,
  gatewayLocation: string | null,
  gatewayLatitude: number | null,
  gatewayLongitude: number | null,
): Promise<Gateway | null> => {
  const result = await dbPool.query<Gateway>(
    `
      INSERT INTO gateways (
        gateway_name,
        gateway_token_hash,
        gateway_description,
        gateway_location,
        gateway_latitude,
        gateway_longitude
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        gateway_id AS "gatewayId",
        gateway_token_hash AS "gatewayTokenHash",
        gateway_description AS "gatewayDescription",
        gateway_name AS "gatewayName",
        gateway_location AS "gatewayLocation",
        gateway_latitude AS "gatewayLatitude",
        gateway_longitude AS "gatewayLongitude"
    `,
    [
      gatewayName,
      gatewayTokenHash,
      gatewayDescription,
      gatewayLocation,
      gatewayLatitude,
      gatewayLongitude,
    ],
  );

  return getFirstRow(result);
};


type FindGatewaysOptions = {
  page: number;
  pageSize: number;
  searchString?: string;
};

export type FindGatewaysResult = {
  gateways: Gateway[];
  totalCount: number;
};


export const findGateways = async ({
  page,
  pageSize,
  searchString,
}: FindGatewaysOptions): Promise<FindGatewaysResult> => {
  const offset = (page - 1) * pageSize;
  const search = searchString?.trim();

  const values: unknown[] = [];
  const whereParts: string[] = [];

  if (search) {
    values.push(`%${search}%`);

    whereParts.push(`
      (
        "gateway_name" ILIKE $${values.length}
        OR "gateway_description" ILIKE $${values.length}
        OR "gateway_location" ILIKE $${values.length}
      )
    `);
  }

  const whereSql = whereParts.length > 0
    ? `WHERE ${whereParts.join(' AND ')}`
    : '';

  const countResult = await dbPool.query(
    `
      SELECT COUNT(*) AS "total_count"
      FROM "gateways"
      ${whereSql}
    `,
    values,
  );

  const totalCount = Number(countResult.rows[0].total_count);

  const listValues = [...values];

  listValues.push(pageSize);
  const limitPlaceholder = `$${listValues.length}`;

  listValues.push(offset);
  const offsetPlaceholder = `$${listValues.length}`;

  const gatewaysResult = await dbPool.query<Gateway>(
    `
      SELECT
        "gateway_id"::int AS "gatewayId",
        "gateway_name" AS "gatewayName",
        "gateway_description" AS "gatewayDescription",
        "gateway_location" AS "gatewayLocation",
        "gateway_latitude" AS "gatewayLatitude",
        "gateway_longitude" AS "gatewayLongitude"
      FROM "gateways"
      ${whereSql}
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `,
    listValues,
  );

  return {
    gateways: gatewaysResult.rows,
    totalCount,
  };
};

type UpdateGatewayInput = Partial<{
  gateway_name: string;
  gateway_description: string | null;
  gateway_location: string | null;
  gateway_latitude: number | null;
  gateway_longitude: number | null;
  gateway_last_status: Gateway['gatewayLastStatus'];
}>;

export const updateGateway = async (
  gatewayId: number,
  data: UpdateGatewayInput,
): Promise<Gateway | null> => {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  const setSql = entries
    .map(([column], index) => `"${column}" = $${index + 1}`)
    .join(', ');

  const values = entries.map(([, value]) => value);

  const result = await dbPool.query<Gateway>(
    `
      UPDATE "gateways"
      SET ${setSql}
      WHERE "gateway_id" = $${values.length + 1}
      RETURNING
        "gateway_id" AS "gatewayId",
        "gateway_name" AS "gatewayName",
        "gateway_description" AS "gatewayDescription",
        "gateway_location" AS "gatewayLocation",
        "gateway_latitude" AS "gatewayLatitude",
        "gateway_longitude" AS "gatewayLongitude",
        "gateway_last_status" AS "gatewayLastStatus"
    `,
    [...values, gatewayId],
  );

  return getFirstRow(result);
};

export const deleteGateway = async (gatewayId: number): Promise<Gateway | null> => {
  const result = await dbPool.query<Gateway>(
    `
      DELETE FROM "gateways"
      WHERE "gateway_id" = $1
      RETURNING
        "gateway_id" AS "gatewayId",
        "gateway_name" AS "gatewayName",
        "gateway_description" AS "gatewayDescription",
        "gateway_location" AS "gatewayLocation",
        "gateway_latitude" AS "gatewayLatitude",
        "gateway_longitude" AS "gatewayLongitude"
    `,
    [gatewayId],
  );

  return getFirstRow(result);
};

export const rotateGatewaySecret = async (
  gatewayId: number,
  gatewayTokenHash: string,
): Promise<number | null> => {
  const result = await dbPool.query<{ gatewayId: number }>(
    `
      UPDATE "gateways"
      SET "gateway_token_hash" = $1
      WHERE "gateway_id" = $2
      RETURNING "gateway_id" AS "gatewayId"
    `,
    [gatewayTokenHash, gatewayId],
  );

  return getFirstRow(result)?.gatewayId ?? null;
};

export type GatewayHealthTelemetry = {
    gatewayId: number;
    lastTelemetryAtUtc: Date;
    nodeBatteryLevel: number | null;
    nodeWifiStrength: number | null;
};


export const getLatestGatewayHealthTelemetry = async (
    gatewayId: number,
    offset = 0,
): Promise<GatewayHealthTelemetry | null> => {
    const result = await dbPool.query<GatewayHealthTelemetry>(
        `
            SELECT
                "telemetry_gateway_id" AS "gatewayId",
                "telemetry_received_at_utc" AS "lastTelemetryAtUtc",
                "telemetry_node_battery_level" AS "nodeBatteryLevel",
                "telemetry_node_wifi_strength" AS "nodeWifiStrength"
            FROM "telemetries"
            WHERE "telemetry_gateway_id" = $1
            ORDER BY "telemetry_received_at_utc" DESC
            LIMIT 1
            OFFSET $2
        `,
        [gatewayId, offset],
    );

    return getFirstRow(result);
};