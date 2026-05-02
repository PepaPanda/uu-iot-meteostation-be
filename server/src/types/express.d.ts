import { Session } from '../modules/api/auth/auth.schema';
import { Gateway } from '../modules/api/gateways/gateways.schema';
import { User } from '../modules/api/users/users.schema';


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