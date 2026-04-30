import type { Response } from 'express';
import { generateAndReturnNewSessionToken } from './auth.service';

import type { LoginUserRequestDto } from './auth.schema';
import type { RegisterUserRequestDto } from '../users/users.schema';

import { findUserByEmail } from '../users/users.repository';

import { NotFoundError, UnauthorizedError, InternalServerError } from '../../../shared/errors';

import { compare as validatePassword } from './auth.service';

import { TypedRequest } from '../../../shared/types';

import { createUser as createUserService } from '../users/users.service';

import env from '../../../env';
import ms from 'ms';
export const login = async (req: TypedRequest<LoginUserRequestDto>, res: Response) => {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if(!user) throw new NotFoundError('User not found');

    const {userId, userEmail, userRole, userNickname} = user;

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

    res
        .cookie('meteoSessionToken', sessionToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: ms(env.SESSION_TOKEN_ROTATE_AFTER),
        })
        .status(200)
        .json({user: {userId, userRole, userEmail, userNickname}});
};

export const registerFromInvite = async (req: TypedRequest<RegisterUserRequestDto>, res: Response): Promise<void> => {
    const { password, token, nickname } = req.body;

    const user = await createUserService(password, token, nickname);

    const sessionToken = await generateAndReturnNewSessionToken(user.userId);

    res.cookie('meteoSessionToken', sessionToken, {
        httpOnly: true,
        secure: env.APP_STAGE === 'production',
        sameSite: 'lax',
        maxAge: ms(env.SESSION_MAX_AGE),
        path: '/',
    });

    res.status(201).json({
        user: {
        id: user.userId,
        email: user.userEmail,
        nickname: user.userNickname,
        role: user.userRole,
        },
    });
};