import express from 'express';

import { login as loginController,  registerFromInvite as registerFromInviteController } from './auth.controller';

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

authRouter.get('/me', (req, res) => {
  res.send('Returns current authenticated user identity and role.');
});

authRouter.post('/register-from-invite/:token', validateBody(registerFromInviteUserSchema), requireNoActiveSession, registerFromInviteController);


export default authRouter;