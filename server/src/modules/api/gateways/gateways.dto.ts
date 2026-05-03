import z from 'zod/v3';

import { createGatewaySchema, updateGatewaySchema, listGatewaysSchema, gatewayIdParamsSchema} from './gateways.schema';

import type { Gateway } from './gateways.types';


//Body
export type CreateGatewayRequestDto = z.infer<typeof createGatewaySchema>;

export type UpdateGatewayRequestDto = z.infer<typeof updateGatewaySchema>;

export type ListGatewaysRequestDto = z.infer<typeof listGatewaysSchema>;

//Params
export type GatewayIdRequestParamsDto = z.infer<typeof gatewayIdParamsSchema>;

//Response DTos
export type GetGatewayResponseDto = {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
};

export const toGetGatewayResponseDto = (gateway: Gateway): GetGatewayResponseDto => ({
  id: gateway.gatewayId,
  name: gateway.gatewayName,
  description: gateway.gatewayDescription,
  location: gateway.gatewayLocation,
  latitude: gateway.gatewayLatitude ? parseFloat(gateway.gatewayLatitude) : null,
  longitude: gateway.gatewayLongitude ? parseFloat(gateway.gatewayLongitude) : null,
});

export type ListGatewaysResponseDto = {
  gateways: GetGatewayResponseDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
};

export const toListGatewaysResponseDto = (
  gateways: Gateway[],
  pagination: ListGatewaysResponseDto['pagination'],
): ListGatewaysResponseDto => ({
  gateways: gateways.map(toGetGatewayResponseDto),
  pagination,
});

export type RotateGatewaySecretResponseDto = { secret: string, gatewayId: number };

export const toRotateGatewaySecretResponseDto = (secret: string, gatewayId: number): RotateGatewaySecretResponseDto => {
    return { secret, gatewayId };
};