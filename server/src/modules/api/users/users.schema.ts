import z from 'zod/v3';

// Request validation schemas for BODY
export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['guest', 'operator', 'supervisor', 'administrator']).optional(),
  search: z.string().trim().max(255).optional(),
});

export const updateUserRoleSchema = z.object({
    role: z.enum(['guest', 'operator', 'supervisor', 'administrator']),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
});

export const registerFromInviteUserSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
  nickname: z.string().trim().min(1).max(255),
});

export const updateUserSchema = z.object({
    email: z.string().email(),
    nickname: z.string().min(2).max(64),
});

export const changeUserPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

// Request validation schemas for PARAMS
export const userIdParamsSchema = z.object({
  userId: z.string().regex(/^\d+$/),
});