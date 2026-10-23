import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/app-error.js';

function parseOrThrow(schema: ZodType, input: unknown): unknown {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));
    throw new AppError('VALIDATION_ERROR', 400, 'Dữ liệu không hợp lệ', details);
  }
  return result.data;
}

/** Kiểm tra `req.query`, kết quả đã parse nằm ở `res.locals['query']`. */
export function validateQuery(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    try {
      res.locals['query'] = parseOrThrow(schema, req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Kiểm tra `req.body`, kết quả đã parse nằm ở `res.locals['body']`. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    try {
      res.locals['body'] = parseOrThrow(schema, req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}
