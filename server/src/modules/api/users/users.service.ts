import crypto from 'crypto';

import { findInvitationByHashedToken, findUserByEmail as findUserByEmailRepository, findUserById as findUserByIdRepository, createInvitation, createUser as createUserRepository, fulfillInvitation as fulfillInvitationRepository } from './users.repository';
import { UnauthorizedError, ConflictError } from '../../../shared/errors';
import { hashPassword } from '../auth/auth.service';

import type { Invitation, User } from './users.types';

const generateInviteToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashInviteToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateAndCreateInvitation = async (
  email: string,
  invitedByUserId: number,
): Promise<string> => {
  const inviteToken = generateInviteToken();
  const inviteTokenHash = hashInviteToken(inviteToken);

  const invitationCreated = await createInvitation(email, inviteTokenHash, invitedByUserId);
  if(!invitationCreated) throw new ConflictError('user with this email already exists'); 

  return inviteToken;
};

export const verifyInvitationToken = async (
  hashedInviteToken: string,
): Promise<Invitation> => {
  const invitation = await findInvitationByHashedToken(hashedInviteToken);

  if (!invitation) {
    throw new UnauthorizedError('Invalid invitation token');
  }

  if (invitation.fulfilledAt !== null) {
    throw new ConflictError('Invitation has already been used');
  }

  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    throw new UnauthorizedError('Invitation has expired');
  }

  return invitation;
};

export const fulfillInvitation = async (
  inviteId: number,
): Promise<void> => {
  await fulfillInvitationRepository(inviteId);
};

// Registration
export const createUser = async (
  password: string,
  plainInviteToken: string,
  nickname: string,
): Promise<User | null> => {
  const hashedPassword = await hashPassword(password);
  const hashedInviteToken = hashInviteToken(plainInviteToken);

  const invitation = await verifyInvitationToken(hashedInviteToken);

  const user = await createUserRepository(
    invitation.email,
    hashedPassword,
    nickname,
  );

  await fulfillInvitation(invitation.inviteId);

  return user;
};


// User

export const findUserById = async (userId: User['userId']): Promise<User | null> => {
   return await findUserByIdRepository(userId);

};

export const findUserByEmail = async (userEmail: User['userEmail']): Promise<User | null> => {
  return await findUserByEmailRepository(userEmail);
};