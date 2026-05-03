import argon2 from 'argon2';
import { Session } from './auth.types';
import { generateSessionToken, hashSessionToken, isSessionRevoked, isSessionExpired, shouldRotateSessionToken } from './auth.helpers';
import { createUserSession, findUserSessionByHashedToken, revokeUserSessionByHashedToken, rotateUserSessionToken, revokeAllSessionsByUserId } from './auth.repository';

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

export const verifySessionToken = async (plainToken: string): VerifySessionToken => {
  const hashedToken = hashSessionToken(plainToken);
  const session = await findUserSessionByHashedToken(hashedToken);
  console.log(session);

  // Must keep the order!
  if(!session) return {status: 'not-found', session};
  if(isSessionRevoked(session)) return {status: 'revoked', session};
  if(isSessionExpired(session)) return {status: 'session-expired', session};
  if(shouldRotateSessionToken(session)) return {status: 'token-expired', session};

  return {status: 'valid', session};

};

export const revokeSession = async (tokenHash: string): Promise<void> => {
  await revokeUserSessionByHashedToken(tokenHash);
  return;
};

export const revokeAllSessions = async (userId: number): Promise<void> => {
  await revokeAllSessionsByUserId(userId);
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
export const hashPassword = async (password: string): Promise<string> => {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
    });
};

export const compare = async (passwordHash: string, password: string): Promise<boolean> => {
    return await argon2.verify(passwordHash, password);
};
