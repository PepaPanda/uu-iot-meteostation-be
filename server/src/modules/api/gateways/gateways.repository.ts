import { dbPool } from '../../../db/pool';
import type { Gateway } from './gateways.schema';
import { getFirstRow } from '../../../db/helpers';

export const findGatewayById = async (
  gatewayId: number,
): Promise<Gateway | null> => {
  const result = await dbPool.query<Gateway>(
    `
      SELECT
        gateway_id AS "gatewayId",
        gateway_remote_id AS "gatewayRemoteId",
        gateway_name AS "gatewayName",
        gateway_token_hash AS "gatewayTokenHash",
        gateway_created_at AS "gatewayCreatedAt",
        gateway_updated_at AS "gatewayUpdatedAt"
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
        gateway_remote_id AS "gatewayRemoteId",
        gateway_name AS "gatewayName",
        gateway_token_hash AS "gatewayTokenHash",
        gateway_created_at AS "gatewayCreatedAt",
        gateway_updated_at AS "gatewayUpdatedAt"
      FROM gateways
      WHERE gateway_token_hash = $1
      LIMIT 1
    `,
    [gatewayTokenHash],
  );

  return getFirstRow(result);
};