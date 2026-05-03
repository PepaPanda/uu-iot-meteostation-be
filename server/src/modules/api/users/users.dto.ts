import z from 'zod/v3';

import { inviteUserSchema } from './users.schema';
import { registerFromInviteUserSchema } from './users.schema';

export type InviteUserRequestDto = z.infer<typeof inviteUserSchema>;
export type RegisterUserRequestDto = z.infer<typeof registerFromInviteUserSchema>;