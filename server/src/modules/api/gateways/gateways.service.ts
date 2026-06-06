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
import { hashGatewayToken, generateNewGatewayToken, resolveGatewayHealthStatus, handleGatewayHealthNotifications } from './gateways.helpers';
import { UpdateGatewayRequestDto, GetGatewayHealthResponseDto, type CreateGatewayRequestDto } from './gateways.dto';
import { toIsoString } from '../../../shared/helpers/utils';

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
  dto: UpdateGatewayRequestDto & { lastStatus?: Gateway['gatewayLastStatus'] }
): Promise<Gateway | null> => {
  const updatedGateway = await updateGateway(gatewayId, {
    gateway_name: dto.name,
    gateway_description: dto.description,
    gateway_location: dto.location,
    gateway_latitude: dto.latitude,
    gateway_longitude: dto.longitude,
    gateway_last_status: dto.lastStatus
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

    const gwStatus = resolveGatewayHealthStatus(
        healthTelemetry?.lastTelemetryAtUtc ?? null,
    );

    // Notifications currently handled on GET gateway health. It would be better to automate this with cron instead of a request in the future
    handleGatewayHealthNotifications({gateway, currentStatus: gwStatus});

    const gwBattery = healthTelemetry?.nodeBatteryLevel ?? null;
    const gwWifi = healthTelemetry?.nodeWifiStrength ?? null;

    return {
        gatewayId,
        status: gwStatus,
        lastTelemetryAtUtc: healthTelemetry
            ? toIsoString(healthTelemetry.lastTelemetryAtUtc)
            : null,
        nodeBatteryLevel: gwBattery,
        nodeWifiStrength: gwWifi,
    };
};