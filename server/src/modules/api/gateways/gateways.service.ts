import {
  createGateway as createGatewayRepository,
  findGatewayById,
  findGatewayByTokenHash,
} from './gateways.repository';
import type { Gateway } from './gateways.types';
import { hashGatewayToken, generateNewGatewayToken } from './gateways.helpers';

import type { CreateGatewayRequestDto } from './gateways.dto';

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


type CreateGatewayResult = {
  gateway: Gateway;
  gatewayToken: string;
};

export const createGateway = async (
  input: CreateGatewayRequestDto,
): Promise<CreateGatewayResult | null> => {
  const gatewayToken = generateNewGatewayToken();
  const gatewayTokenHash = hashGatewayToken(gatewayToken);

  const gateway = await createGatewayRepository(
    input.name,
    gatewayTokenHash,
    input.description,
    input.location,
    input.latitude,
    input.longitude,
  );

  if (!gateway) return null;

  return {
    gateway,
    gatewayToken,
  };
};
