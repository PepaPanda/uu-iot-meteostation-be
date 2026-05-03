import { dbPool } from '../../../db/pool';
import { getFirstRow } from '../../../db/helpers';
import type { Gateway } from './gateways.types';

export const findGatewayById = async (
  gatewayId: number,
): Promise<Gateway | null> => {
  const result = await dbPool.query<Gateway>(
    `
      SELECT
        gateway_id AS "gatewayId",
        gateway_token_hash AS "gatewayTokenHash",
        gateway_description AS "gatewayDescription",
        gateway_name AS "gatewayName",
        gateway_location AS "gatewayLocation",
        gateway_latitude AS "gatewayLatitude",
        gateway_longitude AS "gatewayLongitude"
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
): Promise<Gateway | null> => {
  const result = await dbPool.query<Gateway>(
    `
      SELECT
        gateway_id AS "gatewayId",
        gateway_token_hash AS "gatewayTokenHash",
        gateway_description AS "gatewayDescription",
        gateway_name AS "gatewayName",
        gateway_location AS "gatewayLocation",
        gateway_latitude AS "gatewayLatitude",
        gateway_longitude AS "gatewayLongitude"
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