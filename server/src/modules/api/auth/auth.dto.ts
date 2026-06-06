import z from 'zod/v3';

import type { User } from '../users/users.types';
import { loginUserSchema } from './auth.schema';
import { registerFromInviteUserSchema } from '../users/users.schema';
import { toIsoString } from '../../../shared/helpers/utils';

//Response DTos

export type LoginResponseDto = {
  id: number;
  email: string;
  nickname: string;
  role: string;
};

export const toLoginResponseDto = (user: User): LoginResponseDto => ({
  id: user.userId,
  email: user.userEmail,
  nickname: user.userNickname,
  role: user.userRole,
});

export type CurrentUserInfoResponseDto = {
  id: number;
  email: string;
  nickname: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export const  toCurrentUserInfoResponseDto = (user: User): CurrentUserInfoResponseDto => ({
  id: user.userId,
  email: user.userEmail,
  nickname: user.userNickname,
  role: user.userRole,
  createdAt: toIsoString(user.userCreatedAt),
  updatedAt: toIsoString(user.userUpdatedAt)
});


//Request DTos
export type LoginUserRequestDto = z.infer<typeof loginUserSchema>;
export type RegisterUserRequestDto = z.infer<typeof registerFromInviteUserSchema>;
