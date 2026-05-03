import z from 'zod/v3';

// Request Dtos
export const loginUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

export const logoutUserSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});