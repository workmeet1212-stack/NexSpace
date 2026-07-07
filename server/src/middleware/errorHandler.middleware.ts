import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { errorResponse } from '../utils/apiResponse';
import { env } from '../config/env';

interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  errors?: any;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let error: any = null;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    error = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    statusCode = 409;
    const field = Object.keys((err as any).keyValue || {})[0];
    message = `${field} already exists`;
    error = { field, message: 'Duplicate value' };
  }

  // Zod validation error
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    error = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // JWT errors
  if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Token expired';
  }

  // Custom application errors
  if (err.message.includes('not found')) {
    statusCode = 404;
  }

  if (err.message.includes('Unauthorized')) {
    statusCode = 401;
  }

  if (err.message.includes('Forbidden')) {
    statusCode = 403;
  }

  // Rate limit error
  if (err.message.includes('Too many')) {
    statusCode = 429;
  }

  // Send response
  errorResponse({ res, message, statusCode, error });

  // Don't expose stack trace in production
  if (env.NODE_ENV === 'development') {
    logger.debug('Stack trace:', err.stack);
  }
};

export const notFound = (req: Request, res: Response): void => {
  errorResponse({
    res,
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
