import { Request } from 'express';
import { UnauthorizedError } from '../../../shared/errors';
import type { Session } from './auth.schema';

export const getRequiredSession = (req: Request): Session => {
  if (!req.session) {
    throw new UnauthorizedError('A valid session is required');
  }

  return req.session;
};