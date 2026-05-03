import type { Request, Response, NextFunction} from 'express';
import { ZodSchema, ZodError } from 'zod/v3';
import { BadRequestError, UnprocessableEntityError } from '../shared/errors';
import { isObjectEmpty } from '../shared/helpers/utils';

export const validateParams = (schema: ZodSchema) => {

    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if(!req.params || isObjectEmpty(req.params)) {
                throw new BadRequestError('Params are empty');
            }
            const validatedData = schema.parse(req.params);
            req.params = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                throw new UnprocessableEntityError('Params validation failed', error.issues.map((issue) => (
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
