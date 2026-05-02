import type { Request, Response, NextFunction } from 'express';
import { getRequiredSession } from '../modules/api/auth/auth.helpers';
import { findUserById as findUserByIdService } from '../modules/api/users/users.service';
import { ForbiddenError, InternalServerError } from '../shared/errors';
import type { User } from '../modules/api/users/users.schema';
import { hasRequiredRole } from '../shared/helpers/authorization';

export default (requiredUserRole: User['userRole']) => {

    return async (req: Request, res: Response, next: NextFunction) => {
        const session = getRequiredSession(req);

        //This middleware cannot be called before authentication
        if(!session) throw new InternalServerError();

        const user = await findUserByIdService(session.userId);

        //If there is an active session, user should never be nullish
        if(!user) throw new InternalServerError();

        req.user = user;

        const { userRole } = user;

        const allowed = hasRequiredRole(userRole, requiredUserRole);

        if(!allowed) throw new ForbiddenError("You don't have permission to view this resource");

        next();
    };
};