import { UnauthorizedError } from '../errors';

export const getBearerToken = (authorizationHeader: string | undefined): string => {
  if (!authorizationHeader) {
    throw new UnauthorizedError('Missing authorization header');
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Invalid authorization header format');
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  if (!token) {
    throw new UnauthorizedError('Missing bearer token');
  }

  return token;
};