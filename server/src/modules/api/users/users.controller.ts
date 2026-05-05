import type { Response } from 'express';
import { generateAndCreateInvitation, updateCurrentUserService, changeCurrentUserPasswordService, deleteUserByIdService, listUsersService, getUserByIdService, updateUserRoleByIdService } from './users.service';
import { getRequiredSession } from '../auth/auth.helpers';
import { InviteUserRequestDto, UpdateUserRequestDto, ChangeUserPasswordRequestDto, UserIdRequestParamsDto, ListUsersRequestDto, UpdateUserRoleRequestDto, toUpdateUserResponseDto, toGetUserResponseDto, toListUsersResponseDto, toUpdateUserRoleResponseDto } from './users.dto';
import { Empty } from '../../../shared/types';
import type { TypedRequest } from '../../../shared/types';
import { InternalServerError, NotFoundError } from '../../../shared/errors';

import { clearSessionCookie } from '../auth/auth.helpers';

export const inviteController = async (req: TypedRequest<InviteUserRequestDto>, res: Response) => {
    const { email } = req.body;
    const session = getRequiredSession(req);

    const invitationPlainToken = await generateAndCreateInvitation(email, session.userId);

    res.json({invitationPlainToken});
};

// ---

export const updateCurrentUserController = async (
  req: TypedRequest<UpdateUserRequestDto>,
  res: Response,
) => {
  if(!req.session) throw new InternalServerError('user needs to be authenticated');
  const updatedUser = await updateCurrentUserService(req.session.userId, req.body);

  if (!updatedUser) throw new NotFoundError('User not found');

  res.json(toUpdateUserResponseDto(updatedUser));
};

export const changeCurrentUserPasswordController = async (
  req: TypedRequest<ChangeUserPasswordRequestDto>,
  res: Response,
) => {
  if(!req.session) throw new InternalServerError('user needs to be authenticated');
  const updatedUser = await changeCurrentUserPasswordService(req.session.userId, req.body);

  if (!updatedUser) throw new NotFoundError('User not found');

  res.status(200).send();
};

export const deleteUserController = async (
  req: TypedRequest<Empty, UserIdRequestParamsDto>,
  res: Response,
) => {
  if(!req.session) throw new InternalServerError();

  const deletedUser = await deleteUserByIdService(parseInt(req.params.userId));
  if (!deletedUser) throw new NotFoundError('User not found');

  if(deletedUser.userId === req.session.userId) clearSessionCookie(res);

  res.status(204).send();
};

export const listUsersController = async (
  req: TypedRequest<ListUsersRequestDto>,
  res: Response,
) => {
  const result = await listUsersService(req.body);

  res.json(toListUsersResponseDto(result.users, result.pagination));
};

export const getUserController = async (
  req: TypedRequest<Empty, UserIdRequestParamsDto>,
  res: Response,
) => {
  const user = await getUserByIdService(parseInt(req.params.userId));

  if (!user) throw new NotFoundError('User not found');

  res.json(toGetUserResponseDto(user));
};

export const updateUserRoleController = async (
  req: TypedRequest<UpdateUserRoleRequestDto, UserIdRequestParamsDto>,
  res: Response,
) => {
  const updatedUser = await updateUserRoleByIdService(parseInt(req.params.userId), req.body);

  if (!updatedUser) throw new NotFoundError('User was either not found or could not be updated');

  res.json(toUpdateUserRoleResponseDto(updatedUser));
};