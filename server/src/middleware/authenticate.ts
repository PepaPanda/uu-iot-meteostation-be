import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, InternalServerError } from '../shared/errors';

import ms from 'ms';
import env from '../env';

import { verifySessionToken, rotateToken } from '../modules/api/auth/auth.service';

//Authenticate middleware verifies token and handles user auth
export default async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    //Try to get session token from cookies, if missing, return 403
    const sessionToken = req.cookies?.meteoSessionToken;
    const sessionTokenInvalid = !sessionToken || typeof sessionToken !== 'string';
    if (sessionTokenInvalid) throw new UnauthorizedError();

    //If token is present, verify it and get session info
    const { status, session } = await verifySessionToken(sessionToken);

    //403 for bad tokens
    if(!session || status === 'revoked' || status === 'not-found' || status === 'session-expired') {
        res.clearCookie('meteoSessionToken');
        throw new UnauthorizedError();
    }

    req.session = session;

    //Rotate new token for valid sessions if needed
    if(status === 'token-expired') {
        const newToken = await rotateToken(session.sessionId, sessionToken);
        res.cookie('meteoSessionToken', newToken, {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: ms(env.SESSION_TOKEN_ROTATE_AFTER),
            });

        return next();
    }

    if(status === 'valid') {
        return next();
    }

    throw new InternalServerError();

};