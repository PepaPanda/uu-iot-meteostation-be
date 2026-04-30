import { NextFunction, Request, Response } from 'express';

import { ConflictError, InternalServerError } from '../shared/errors';

import { verifySessionToken } from '../modules/api/auth/auth.service';

export default async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sessionToken = req.cookies?.['meteoSessionToken'];
    console.log(req.headers.cookies);
    if (!(sessionToken && typeof sessionToken === 'string')) return next();

    const session = await verifySessionToken(sessionToken);

    if(!session || session.status === 'revoked' || session.status === 'not-found' || session.status === 'session-expired') {
        res.clearCookie('meteoSessionToken');
        return next();
    }

    if(session.status === 'valid' || session.status === 'token-expired') throw new ConflictError('User already logged in');

    throw new InternalServerError();
};