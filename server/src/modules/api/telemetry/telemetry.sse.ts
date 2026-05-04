import type { Response } from 'express';

type TelemetrySseClient = {
    id: string;
    gatewayId: number;
    res: Response;
};

const clients = new Map<string, TelemetrySseClient>();

const createClientId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const addTelemetrySseClient = (
    gatewayId: number,
    res: Response,
): string => {
    const clientId = createClientId();

    clients.set(clientId, {
        id: clientId,
        gatewayId,
        res,
    });

    return clientId;
};

export const removeTelemetrySseClient = (
    clientId: string,
): void => {
    clients.delete(clientId);
};

export const emitTelemetrySseEvent = (
    gatewayId: number,
    eventName: string,
    data: unknown,
): void => {
    for (const client of clients.values()) {
        if (client.gatewayId !== gatewayId) continue;

        client.res.write(`event: ${eventName}\n`);
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
};

export const emitTelemetrySseHeartbeat = (
    clientId: string,
): void => {
    const client = clients.get(clientId);

    if (!client) return;

    client.res.write('event: heartbeat\n');
    client.res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
};