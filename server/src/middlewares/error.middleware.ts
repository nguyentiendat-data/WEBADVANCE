import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';

const DUPLICATE_KEY_MESSAGES: Record<string, { code: string; message: string }> = {
  email: { code: 'EMAIL_EXISTS', message: 'Email này đã được sử dụng' },
  phoneNumber: { code: 'PHONE_EXISTS', message: 'Số điện thoại này đã được sử dụng' },
  googleId: { code: 'GOOGLE_EMAIL_EXISTS', message: 'Tài khoản Google này đã được liên kết' },
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Không tìm thấy ${req.method} ${req.originalUrl}` },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          issue: issue.message,
        })),
      },
    });
    return;
  }

  if (isDuplicateKeyError(error)) {
    const field = Object.keys(error.keyPattern)[0] ?? '';
    const mapped = DUPLICATE_KEY_MESSAGES[field];
    res.status(409).json({
      success: false,
      error: mapped
        ? { ...mapped }
        : { code: 'CONFLICT', message: 'Dữ liệu đã tồn tại' },
    });
    return;
  }

  logger.error({ err: error }, 'Lỗi không xử lý được');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống, vui lòng thử lại sau' },
  });
};

function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern: Record<string, unknown> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}
