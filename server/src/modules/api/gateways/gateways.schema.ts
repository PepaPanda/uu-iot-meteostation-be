import z from 'zod/v3';

// App object
export type Gateway = {
  gatewayId: number;
  gatewayTokenHash: string;
  gatewayDescription: string | null;
  gatewayName: string;
  gatewayLocation: string | null;
  gatewayLatitude: string | null;
  gatewayLongitude: string | null;
};

// Request DTOs

export const listGatewaysSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
});

export const createGatewaySchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
  location: z.string().trim().min(1).max(255),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});

export type CreateGatewayRequestDto = z.infer<typeof createGatewaySchema>;

export const getSpecificGatewaySchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});

export type getGatewayByIdRequestDto = z.infer<typeof getSpecificGatewaySchema>;

export const updateGatewaySchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    location: z.string().trim().min(1).max(255).optional(),
    latitude: z.number().gte(-90).lte(90).optional(),
    longitude: z.number().gte(-180).lte(180).optional(),
  }).refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  }),
});

export type updateGatewayRequestDto = z.infer<typeof updateGatewaySchema>;

export const rotateGatewaySecretSchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});

export type rotateGatewaySecretRequestDto = z.infer<typeof rotateGatewaySecretSchema>;

export const deleteGatewaySchema = z.object({
  params: z.object({
    gatewayId: z.string().regex(/^\d+$/),
  }),
});

export type deleteGatewayRequestDto = z.infer<typeof deleteGatewaySchema>;