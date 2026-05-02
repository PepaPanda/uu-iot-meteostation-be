import { findGatewayById, findGatewayByTokenHash } from './gateways.repository';
import type { Gateway } from './gateways.schema';
import { hashGatewayToken } from './gateways.helpers';

export const getGatewayByPlainToken = async (
  gatewayToken: string,
): Promise<Gateway | null> => {
  const gatewayTokenHash = hashGatewayToken(gatewayToken);

  return findGatewayByTokenHash(gatewayTokenHash);
};

export const getGatewayById = async (
  gatewayId: number,
): Promise<Gateway | null> => {
  return findGatewayById(gatewayId);
};