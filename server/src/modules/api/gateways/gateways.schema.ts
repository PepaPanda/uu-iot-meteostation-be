import z from 'zod/v3';

// Request validation schemas for BODY
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

export const updateGatewaySchema = z.object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    location: z.string().trim().min(1).max(255).optional(),
    latitude: z.number().gte(-90).lte(90).optional(),
    longitude: z.number().gte(-180).lte(180).optional(),
  }).refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
});

// Request validation schemas for PARAMS
export const gatewayIdParamsSchema = z.object({
  gatewayId: z.string().regex(/^\d+$/),
});