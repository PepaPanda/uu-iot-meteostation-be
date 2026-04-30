import argon2 from 'argon2';
import type { Password } from '../users/users.schema';

import { createUserSession, findUserSessionByHashedToken, revokeUserSessionByHashedToken, rotateUserSessionToken } from './auth.repository';
import crypto from 'node:crypto';

import { Session } from './auth.schema';
import env from '../../../env';
import ms from 'ms';

import { toTime } from '../../../shared/helpers';

//Helpers
const generateSessionToken = (): string => {
  return crypto.randomBytes(64).toString('base64url');
};

const hashSessionToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const isSessionExpired = (session: Session): boolean => {
  return toTime(session.expiresAt) <= Date.now();
};

const isSessionRevoked = (session: Session): boolean => {
  return session.revokedAt !== null;
};

export const shouldRotateSessionToken = (session: Session): boolean => {
  return toTime(session.tokenRotatedAt) + ms(env.SESSION_TOKEN_ROTATE_AFTER) <= Date.now();
};


// Session
export const generateAndReturnNewSessionToken = async (userId: number): Promise<string> => {
    const sessionToken = generateSessionToken();
    const hashedSessionToken = hashSessionToken(sessionToken);
    await createUserSession(userId, hashedSessionToken);

    return sessionToken;
};

type VerifySessionToken = Promise<{
  status: 'valid' | 'session-expired' | 'token-expired' | 'revoked' | 'not-found',
  session: Session | null
}>

export const verifySessionToken = async (token: string): VerifySessionToken => {
  const hashedToken = hashSessionToken(token);
  const session = await findUserSessionByHashedToken(hashedToken);

  // Must keep the order!
  if(!session) return {status: 'not-found', session};
  if(isSessionRevoked(session)) return {status: 'revoked', session};
  if(isSessionExpired(session)) return {status: 'session-expired', session};
  if(shouldRotateSessionToken(session)) return {status: 'token-expired', session};

  return {status: 'valid', session};

};

export const revokeSession = async (token: string): Promise<void> => {
  const hashedToken = hashSessionToken(token);
  await revokeUserSessionByHashedToken(hashedToken);
  return;
};

export const rotateToken = async (sessionId: number, oldToken: string): Promise<string> => {
    const oldHashedToken = hashSessionToken(oldToken);
    const newPlainToken = generateSessionToken();
    const newHashedToken = hashSessionToken(newPlainToken);

    await rotateUserSessionToken(sessionId, oldHashedToken, newHashedToken);
    return newPlainToken;
};


// Password
export const hashPassword = async (password: Password): Promise<string> => {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
    });
};

export const compare = async (passwordHash: string, password: Password): Promise<boolean> => {
    return await argon2.verify(passwordHash, password);
};



