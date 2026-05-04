export type Telemetry = {
    id: number;
    remoteId: number;
    gatewayId: number;
    measuredAtUtc: Date;
    receivedAtUtc: Date;
    temperature: number;
    pressure: number;
    humidity: number;
    lighting: number;
    raindropsAmount: number;
    nodeBatteryLevel: number | null;
    nodeWifiStrength: number | null;
}