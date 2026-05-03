//Db query results
export type Session = {
  sessionId: number;
  userId: number;
  tokenHash: string;
  tokenRotatedAt: Date | string;
  expiresAt: Date | string;
  createdAt: Date | string;
  revokedAt: Date | null;
};