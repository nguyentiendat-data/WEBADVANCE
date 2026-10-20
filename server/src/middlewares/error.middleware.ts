import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 404, 'Không tìm thấy tài nguyên'));
};

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  console.warn('Lỗi không xác định:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
  });
};
