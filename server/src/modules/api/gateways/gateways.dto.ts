import z from 'zod/v3';

import { createGatewaySchema, getSpecificGatewaySchema, updateGatewaySchema, rotateGatewaySecretSchema, deleteGatewaySchema } from './gateways.schema';

export type CreateGatewayRequestDto = z.infer<typeof createGatewaySchema>;

export type getGatewayByIdRequestDto = z.infer<typeof getSpecificGatewaySchema>;

export type updateGatewayRequestDto = z.infer<typeof updateGatewaySchema>;

export type rotateGatewaySecretRequestDto = z.infer<typeof rotateGatewaySecretSchema>;

export type deleteGatewayRequestDto = z.infer<typeof deleteGatewaySchema>;