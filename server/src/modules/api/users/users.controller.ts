import type { Response } from 'express';
import { generateAndCreateInvitation } from './users.service';

import { getRequiredSession } from '../auth/auth.helpers';
import { InviteUserRequestDto } from './users.schema';

import type { TypedRequest } from '../../../shared/types';

export const inviteController = async (req: TypedRequest<InviteUserRequestDto>, res: Response) => {
    const { email } = req.body;
    const session = getRequiredSession(req);

    const invitationPlainToken = await generateAndCreateInvitation(email, session.userId);

    res.json({invitationPlainToken});
};