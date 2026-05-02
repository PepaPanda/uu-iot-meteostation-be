import { Request, Response, NextFunction } from 'express';
import AppError, { BadRequestError } from '../shared/errors';

import { DatabaseError } from 'pg';

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

  if (err instanceof DatabaseError) {
    if (err.code === '23505') {
      res.status(409).json({
        message: 'Resource already exists',
      });
      return;
    }

    if (err.code === '23503') {
      res.status(409).json({
        message: 'Referenced resource does not exist',
      });
      return;
    }

    if (err.code === '23502') {
      res.status(400).json({
        message: 'Missing required value',
      });
      return;
    }

    if (err.code === '23514') {
      res.status(400).json({
        message: 'Invalid value',
      });
      return;
    }

    res.status(500).json({
      message: 'Database error',
    });
    return;
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