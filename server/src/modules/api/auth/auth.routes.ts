import express from 'express';

import { login as loginController,  registerFromInvite as registerFromInviteController, getAuthenticatedUserInformation as getAuthenticatedUserInformationController, logout as logoutController, logoutEverywhere as logoutEverywhereController } from './auth.controller';

import { validateBody } from '../../../middleware/validateBody';
import { loginUserSchema } from './auth.schema';
import authenticate from '../../../middleware/authenticate';
import requireNoActiveSession from '../../../middleware/requireNoActiveSession';

import { registerFromInviteUserSchema } from '../users/users.schema';

const authRouter = express.Router();

authRouter.post('/login', validateBody(loginUserSchema), requireNoActiveSession, loginController);

authRouter.post('/logout', authenticate,  logoutController);

authRouter.post('/logout-everywhere', authenticate, logoutEverywhereController);

authRouter.get('/me', authenticate, getAuthenticatedUserInformationController);

authRouter.post('/register-from-invite', validateBody(registerFromInviteUserSchema), requireNoActiveSession, registerFromInviteController);



export default authRouter;