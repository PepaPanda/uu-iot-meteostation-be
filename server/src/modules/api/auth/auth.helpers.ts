import { Request } from 'express';
import { UnauthorizedError } from '../../../shared/errors';
import type { Session } from './auth.types';
import type { Response } from 'express';
import env from '../../../env';

import ms from 'ms';

import { toTime } from '../../../shared/helpers/utils';

import crypto from 'node:crypto';

const SESSION_COOKIE_NAME = 'meteoSessionToken';

export const getRequiredSession = (req: Request): Session => {
  if (!req.session) {
    throw new UnauthorizedError('A valid session is required');
  }

  return req.session;
};

export const attachSessionCookie = (res: Response, sessionToken: string): void => {
      res.cookie(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: ms(env.SESSION_MAX_AGE),
        path: '/',
    });
};

export const clearSessionCookie = (res: Response): void => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
};

export const generateSessionToken = (): string => {
  return crypto.randomBytes(64).toString('base64url');
};

export const hashSessionToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const isSessionExpired = (session: Session): boolean => {
  return toTime(session.expiresAt) <= Date.now();
};

export const isSessionRevoked = (session: Session): boolean => {
  return session.revokedAt !== null;
};

export const shouldRotateSessionToken = (session: Session): boolean => {
  return toTime(session.tokenRotatedAt) + ms(env.SESSION_TOKEN_ROTATE_AFTER) <= Date.now();
};
