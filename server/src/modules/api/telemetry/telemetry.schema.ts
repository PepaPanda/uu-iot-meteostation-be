import z from 'zod/v3';

// Request validation schemas for BODY
export const getTelemetryHistorySchema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    limit: z.coerce.number().int().min(1).max(5000).default(500),
}).refine((v) => new Date(v.from) < new Date(v.to), {
    message: 'from must be before to',
});

export const getTrendsSchema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    bucket: z.enum(['15m', '30m', '1h', '6h', '1d']),
}).refine((v) => new Date(v.from) < new Date(v.to), {
    message: 'from must be before to',
});