import type { CollectTelemetryDto } from './data.schema';
import { createTelemetry } from './data.repository';

import { emitTelemetrySseEvent } from '../../api/telemetry/telemetry.sse';
import { toGetLatestTelemetryResponseDto } from '../../api/telemetry/telemetry.dto';

export const collectTelemetry = async (
  telemetry: CollectTelemetryDto,
  gatewayId: number,
): Promise<void> => {
  const createdTelemetry = await createTelemetry(telemetry, gatewayId);

  emitTelemetrySseEvent(
    createdTelemetry.gatewayId,
    'telemetry',
    toGetLatestTelemetryResponseDto(createdTelemetry),
  );
};