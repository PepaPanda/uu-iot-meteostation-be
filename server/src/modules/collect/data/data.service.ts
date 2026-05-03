import type { CollectTelemetryDto } from './data.schema';
import { createTelemetry } from './data.repository';

export const collectTelemetry = async (
  telemetry: CollectTelemetryDto,
  gatewayId: number,
): Promise<void> => {
  await createTelemetry(telemetry, gatewayId);
  return;
};