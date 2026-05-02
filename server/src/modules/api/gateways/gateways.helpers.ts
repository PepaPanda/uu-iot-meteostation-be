import crypto from 'crypto';

export const hashGatewayToken = (gatewayToken: string): string => {
  return crypto.createHash('sha256').update(gatewayToken).digest('hex');
};