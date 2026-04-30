import { Request, Response, NextFunction } from 'express';
import { errorResponse } from './responseFactory';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  const statusCode = err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const errorMessage = err.message || 'An unexpected error occurred.';

  res.status(statusCode).json(errorResponse(errorCode, errorMessage));
};
