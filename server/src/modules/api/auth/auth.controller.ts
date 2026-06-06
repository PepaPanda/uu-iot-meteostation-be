import type { Response, Request } from 'express';
import { generateAndReturnNewSessionToken, compare as validatePassword, revokeSession, revokeAllSessions } from './auth.service';
import { createUser as createUserService, findUserById as findUserByIdService } from '../users/users.service';
import { createNotificationForOneUserService as createNotificationForOneUser } from '../notifications/notifications.service';

import { findUserByEmail } from '../users/users.repository';

import { attachSessionCookie, getRequiredSession, clearSessionCookie } from './auth.helpers';

import type { LoginUserRequestDto } from './auth.dto';
import { toLoginResponseDto, toCurrentUserInfoResponseDto } from './auth.dto';
import type { RegisterUserRequestDto } from './auth.dto';
import { NotFoundError, UnauthorizedError, InternalServerError } from '../../../shared/errors';

import { TypedRequest } from '../../../shared/types';


export const login = async (req: TypedRequest<LoginUserRequestDto>, res: Response) => {
    const { email, password } = req.body;

    const user = await findUserByEmail(email, {includePassword: true});
    if(!user) throw new NotFoundError('User not found');
    if(!user.userPasswordHash) throw new InternalServerError();

    let passwordIsValid: boolean;
    try {
        passwordIsValid = await validatePassword(user.userPasswordHash, password);
    } catch (error) {
        //Logger can be here - this is a case when hash saved in DB is not in argon2 format
        console.error(error);
        throw new InternalServerError();
    }
    if(!passwordIsValid) throw new UnauthorizedError('Invalid password');

    const sessionToken = await generateAndReturnNewSessionToken(user.userId);

    attachSessionCookie(res, sessionToken);

    res
        .status(200)
        .json(toLoginResponseDto(user));
};

export const registerFromInvite = async (req: TypedRequest<RegisterUserRequestDto>, res: Response): Promise<void> => {
    const { password, token, nickname } = req.body;

    const user = await createUserService(password, token, nickname);
    if(!user) throw new InternalServerError('Could not create user');

    await createNotificationForOneUser({userId: user.userId, type: 'info', text:'Vítejte v aplikaci MeteoTrack!', gatewayId: null});

    const sessionToken = await generateAndReturnNewSessionToken(user.userId);
    attachSessionCookie(res, sessionToken);

    res.status(201).json(toLoginResponseDto(user));
};

export const getAuthenticatedUserInformation = async (req: Request, res: Response) => {
    const session = getRequiredSession(req);
    const user = await findUserByIdService(session.userId);
    if(!user) throw new NotFoundError('User not found');
    res.json(toCurrentUserInfoResponseDto(user));
};

export const logout = async (req: Request, res: Response) => {
    const session = getRequiredSession(req);
    await revokeSession(session.tokenHash);
    clearSessionCookie(res);
    res.status(204).send();
};

export const logoutEverywhere = async (req: Request, res: Response) => {
    const session = getRequiredSession(req);
    await revokeAllSessions(session.userId);
    clearSessionCookie(res);
    res.status(204).send();
};