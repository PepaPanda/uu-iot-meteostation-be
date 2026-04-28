import { Request, Response, NextFunction } from 'express';
import AppError, { BadRequestError } from '../shared/errors';

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err);

  if (res.headersSent) {
    // Response already started, so we can't change status/body anymore.
    // Let Express's default error handler close/finish the broken response.
    // Edge cases
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.code).json({
      error: err.name,
      message: err.message,
      details: err.details
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
  });
};

export const invalidSyntaxErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
    console.error(err);

    if (err instanceof SyntaxError && 'body' in err) {
      throw new BadRequestError('invalid JSON body');
    }

  next(err);
};