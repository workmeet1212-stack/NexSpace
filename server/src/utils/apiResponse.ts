import { Response } from 'express';

interface SuccessResponseOptions<T> {
  res: Response;
  data: T;
  message?: string;
  statusCode?: number;
}

interface PaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ErrorResponseOptions {
  res: Response;
  message: string;
  statusCode?: number;
  error?: any;
}

export const successResponse = <T>({
  res,
  data,
  message = 'Success',
  statusCode = 200,
}: SuccessResponseOptions<T>): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

export const paginatedResponse = <T>({
  res,
  data,
  page,
  limit,
  total,
  message = 'Success',
}: {
  res: Response;
  data: T[];
  page: number;
  limit: number;
  total: number;
  message?: string;
}): Response => {
  const totalPages = Math.ceil(total / limit);
  const paginatedData: PaginatedData<T> = {
    items: data,
    page,
    limit,
    total,
    totalPages,
  };

  return res.status(200).json({
    success: true,
    data: paginatedData,
    message,
    meta: { page, limit, total, totalPages },
  });
};

export const errorResponse = ({
  res,
  message,
  statusCode = 400,
  error,
}: ErrorResponseOptions): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error || null,
  });
};

export const notFoundResponse = (res: Response, message = 'Resource not found'): Response => {
  return errorResponse({ res, message, statusCode: 404 });
};

export const unauthorizedResponse = (res: Response, message = 'Unauthorized'): Response => {
  return errorResponse({ res, message, statusCode: 401 });
};

export const forbiddenResponse = (res: Response, message = 'Forbidden'): Response => {
  return errorResponse({ res, message, statusCode: 403 });
};

export const serverErrorResponse = (res: Response, message = 'Internal server error'): Response => {
  return errorResponse({ res, message, statusCode: 500 });
};
