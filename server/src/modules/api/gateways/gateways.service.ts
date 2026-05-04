import {
  createGateway as createGatewayRepository,
  findGatewayById,
  findGatewayByTokenHash,
  findGateways,
  updateGateway,
  deleteGateway,
  rotateGatewaySecret,
  getLatestGatewayHealthTelemetry
} from './gateways.repository';
import type { Gateway } from './gateways.types';
import { hashGatewayToken, generateNewGatewayToken, resolveGatewayHealthStatus } from './gateways.helpers';

import { UpdateGatewayRequestDto, GetGatewayHealthResponseDto } from './gateways.dto';

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

export const listMatchingGatewaysWithPagination = async (
  page: number,
  pageSize: number,
  search?: string,
) => {
  const { gateways, totalCount } = await findGateways(
    {page,
    pageSize,
    searchString: search
  });

  return {
    gateways,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
};

export const updateGatewayByIdService = async (
  gatewayId: number,
  dto: UpdateGatewayRequestDto,
): Promise<Gateway | null> => {
  const updatedGateway = await updateGateway(gatewayId, {
    gateway_name: dto.name,
    gateway_description: dto.description,
    gateway_location: dto.location,
    gateway_latitude: dto.latitude,
    gateway_longitude: dto.longitude,
  });

  return updatedGateway;
};

export const deleteGatewayByIdService = async (
  gatewayId: number,
): Promise<Gateway | null> => {
  return await deleteGateway(gatewayId);
};

export const rotateGatewaySecretService = async (
  gatewayId: number,
): Promise<string | null> => {
  const token = generateNewGatewayToken();
  const tokenHash = hashGatewayToken(token);

  const updatedGatewayId = await rotateGatewaySecret(gatewayId, tokenHash);

  if (!updatedGatewayId) return null;

  return token;
};

export const getGatewayHealthService = async (
    gatewayId: number,
): Promise<GetGatewayHealthResponseDto | null> => {
    const gateway = await findGatewayById(gatewayId);

    if (!gateway) {
        return null;
    }

    const healthTelemetry = await getLatestGatewayHealthTelemetry(gatewayId);

    return {
        gatewayId,
        status: resolveGatewayHealthStatus(healthTelemetry?.lastTelemetryAtUtc ?? null),
        lastTelemetryAtUtc: healthTelemetry
            ? String(healthTelemetry.lastTelemetryAtUtc)
            : null,
        nodeBatteryLevel: healthTelemetry?.nodeBatteryLevel ?? null,
        nodeWifiStrength: healthTelemetry?.nodeWifiStrength ?? null,
    };
};