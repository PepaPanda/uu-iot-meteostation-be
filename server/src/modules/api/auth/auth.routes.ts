import express from 'express';

import { login as loginController,  registerFromInvite as registerFromInviteController, getAuthenticatedUserInformation as getAuthenticatedUserInformationController } from './auth.controller';

import { validateBody } from '../../../middleware/validateBody';
import { loginUserSchema } from '../../../shared/zodSchemas';

import authenticate from '../../../middleware/authenticate';
import requireNoActiveSession from '../../../middleware/requireNoActiveSession';

import { registerFromInviteUserSchema } from '../users/users.schema';

const authRouter = express.Router();

authRouter.post('/login', validateBody(loginUserSchema), requireNoActiveSession, loginController);

authRouter.post('/logout', authenticate,  (req, res) => {
  res.send('logout post');
});

authRouter.get('/me', authenticate, getAuthenticatedUserInformationController);

authRouter.post('/register-from-invite/', validateBody(registerFromInviteUserSchema), requireNoActiveSession, registerFromInviteController);


export default authRouter;