import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      details: error.errors.map((item) => ({
        path: item.path.join('.'),
        message: item.message
      }))
    });
  }

  console.error(error);

  return res.status(500).json({
    error: 'InternalServerError',
    message: 'Something went wrong'
  });
};
