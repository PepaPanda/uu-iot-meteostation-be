import type { Session } from '../modules/api/auth/auth.types';
import type { Gateway } from '../modules/api/gateways/gateways.types';
import type { User } from '../modules/api/users/users.types';


declare global {
  namespace Express {
    interface Request {
      session?: Session;
      gateway?: Gateway;
      user?: User;
    }
  }
}

export {};