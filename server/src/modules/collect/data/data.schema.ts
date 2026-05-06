import z from 'zod/v3';

export const collectTelemetrySchema = z.object({
  remoteId: z.string().regex(/^\d+$/, 'Remote ID must contain only digits'),
  measuredAtUtc: z.string().datetime(),
  temperature: z.number().finite(),
  pressure: z.number().finite(),
  humidity: z.number().gte(0).lte(100),
  lighting: z.number().gte(0),
  raindropsAmount: z.number().int().nonnegative(),
  nodeBatteryLevel: z.number().int().gte(0).lte(100).optional(),
  nodeWifiStrength: z.number().int().optional(),
});

export type CollectTelemetryDto = z.infer<typeof collectTelemetrySchema>;

export const collectHistoricalTelemetriesSchema = z.object({
  records: z.array(collectTelemetrySchema)
});

export type CollectHistoricalTelemetriesDto = z.infer<typeof collectHistoricalTelemetriesSchema>;