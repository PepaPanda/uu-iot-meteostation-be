import z from 'zod/v3';

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

export type Invitation = {
  inviteId: number;
  email: string;
  tokenHash: string;
  invitedBy: number;
  expiresAt: Date;
  fulfilledAt: Date | null;
};


// Request Dtos
export const loginUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

export type LoginUserRequestDto = z.infer<typeof loginUserSchema>

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

export const logoutUserSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

//Response Dtos
export type LoginUserResponseDto = {accessToken: string};