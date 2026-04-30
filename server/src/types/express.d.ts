import { Session } from '../modules/api/auth/auth.schema';

declare global {
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

export {};