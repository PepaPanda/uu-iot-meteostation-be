import type { CollectTelemetryDto, CollectHistoricalTelemetriesDto } from './data.schema';
import { createTelemetry, createMultipleTelemetries } from './data.repository';

import { emitTelemetrySseEvent } from '../../api/telemetry/telemetry.sse';
import { toGetLatestTelemetryResponseDto } from '../../api/telemetry/telemetry.dto';
import { evaluateTelemetryNotificationsService as evaluateTelemetryNotifications } from '../../api/telemetry/telemetry.service';

export const collectTelemetry = async (
  telemetry: CollectTelemetryDto,
  gatewayId: number,
): Promise<void> => {
  const createdTelemetry = await createTelemetry(telemetry, gatewayId);

  await evaluateTelemetryNotifications(gatewayId);

  emitTelemetrySseEvent(
    createdTelemetry.gatewayId,
    'telemetry',
    toGetLatestTelemetryResponseDto(createdTelemetry),
  );
};

export const collectHistoricalTelemetry = async (
  telemetries: CollectHistoricalTelemetriesDto['records'],
  gatewayId: number,
): Promise<void> => {
  await createMultipleTelemetries(telemetries, gatewayId);
  return;
};