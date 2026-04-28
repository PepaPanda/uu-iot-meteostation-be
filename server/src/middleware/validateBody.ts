import type { Request, Response, NextFunction} from 'express';
import { ZodSchema, ZodError } from 'zod/v3';
import { BadRequestError, UnprocessableEntityError } from '../shared/errors';

import { isObjectEmpty } from '../shared/helpers';


export const validateBody = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if(isObjectEmpty(req.body)) {
                throw new BadRequestError('Body is empty, you need to send a request body');
            }
            const validatedData = schema.parse(req.body);
            req.body = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                throw new UnprocessableEntityError('Validation failed', error.issues.map((issue) => (
                    {
                        field: issue.path.join(''),
                        message: issue.message
                    }
                )));
            }
            next(error);
        }
    };
};
