import z from 'zod/v3';

import { inviteUserSchema, listUsersSchema, updateUserRoleSchema, updateUserSchema, changeUserPasswordSchema, userIdParamsSchema } from './users.schema';

import type { User } from './users.types';


//Requst Body DTOs
export type InviteUserRequestDto = z.infer<typeof inviteUserSchema>;
export type ListUsersRequestDto = z.infer<typeof listUsersSchema>;
export type UpdateUserRoleRequestDto = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserRequestDto = z.infer<typeof updateUserSchema>;
export type ChangeUserPasswordRequestDto = z.infer<typeof changeUserPasswordSchema>;

//Request Params DTOs
export type UserIdRequestParamsDto = z.infer<typeof userIdParamsSchema>;

//Response DTOs
export type InviteUserResponseDto = {
    invitationPlainToken: string;
};
export type GetUserResponseDto = {
    id: number;
    email: string;
    role: User['userRole'];
    nickname: string;
    createdAt: string;
    registeredAt: string;
    updatedAt: string;
};

export type ListUsersResponseDto = {
  users: GetUserResponseDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
};


export type UpdateUserRoleResponseDto = {
    id: number;
    role: User['userRole'];
    updatedAt: string;
};

export type UpdateUserResponseDto = GetUserResponseDto;

//Response DTO conversion methods
export const toInviteUserResponseDto = (invitationPlainToken: string) => {
    return { invitationPlainToken };
};

export const toGetUserResponseDto = (user: User): GetUserResponseDto => {
    return {
        id: user.userId,
        email: user.userEmail,
        role: user.userRole,
        nickname: user.userNickname,
        createdAt: String(user.userCreatedAt),
        registeredAt: String(user.userRegisteredAt),
        updatedAt: String(user.userUpdatedAt),
    };
};

export const toListUsersResponseDto = (users: User[], pagination: ListUsersResponseDto['pagination']): ListUsersResponseDto => {
    return {
        users: users.map(u => toGetUserResponseDto(u)),
        pagination,
    };
};

export const toUpdateUserRoleResponseDto = (updatedUser: Pick<User, 'userId' | 'userRole' | 'userUpdatedAt'>): UpdateUserRoleResponseDto => {
    return {
        id: updatedUser.userId,
        role: updatedUser.userRole,
        updatedAt: String(updatedUser.userUpdatedAt),
    };
};

export const toUpdateUserResponseDto = toGetUserResponseDto;
