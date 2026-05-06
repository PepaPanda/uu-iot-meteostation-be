import express from 'express';
import authenticate from '../../../middleware/authenticate';

import requireUserRole from '../../../middleware/requireUserRole';
import { validateBody } from '../../../middleware/validateBody';
import { validateParams } from '../../../middleware/validateParams';

import { inviteUserSchema, userIdParamsSchema, updateUserSchema, changeUserPasswordSchema, listUsersSchema, updateUserRoleSchema } from './users.schema';

import { inviteController, updateCurrentUserController, changeCurrentUserPasswordController, deleteUserController, listUsersController, getUserController, updateUserRoleController } from './users.controller';

const usersRouter = express.Router();

usersRouter.patch('/update', authenticate, validateBody(updateUserSchema), updateCurrentUserController);

usersRouter.patch('/change-password', authenticate, validateBody(changeUserPasswordSchema), changeCurrentUserPasswordController);

usersRouter.delete('/:userId', authenticate, requireUserRole('administrator'), validateParams(userIdParamsSchema), deleteUserController);

usersRouter.post('/invite', authenticate, requireUserRole('administrator'), validateBody(inviteUserSchema), inviteController);

usersRouter.post('/list',  authenticate, requireUserRole('supervisor'), validateBody(listUsersSchema), listUsersController);

usersRouter.get('/:userId', authenticate, requireUserRole('operator'), validateParams(userIdParamsSchema), getUserController);

usersRouter.patch('/:userId/role', authenticate, requireUserRole('administrator'),  validateParams(userIdParamsSchema), validateBody(updateUserRoleSchema), updateUserRoleController);


export default usersRouter;