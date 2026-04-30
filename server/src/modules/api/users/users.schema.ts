import z from 'zod/v3';


//App schemas
export const userSchema = z.object({
  userId: z.number(),
  userEmail: z.string().email(),
  userPasswordHash: z.string(),
  userRole: z.enum(['guest', 'operator', 'supervisor', 'administrator']),
  userNickname: z.string(),
  userCreatedAt: z.string().datetime(),
  userRegisteredAt: z.string().datetime(),
  userUpdatedAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

export const emailSchema = z.string().email();
export type Email = z.infer<typeof emailSchema>;

export const passwordSchema = z.string();
export type Password = z.infer<typeof passwordSchema>;

// Request (input) DTO schemas
export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['guest', 'operator', 'supervisor', 'administrator']).optional(),
  search: z.string().trim().max(255).optional(),
});

export const getSpecificUserSchema = z.object({
  params: z.object({
    userId: z.number(),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    userId: z.number(),
  }),
  body: z.object({
    role: z.enum(['guest', 'operator', 'supervisor', 'administrator']),
  }),
});

// Invites
export const inviteUserSchema = z.object({
  email: z.string().email(),
});

export type InviteUserRequestDto = z.infer<typeof inviteUserSchema>;

export const registerFromInviteUserSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
  nickname: z.string().trim().min(1).max(255),
});

export type RegisterUserRequestDto = z.infer<typeof registerFromInviteUserSchema>;