import type { Request, RequestHandler } from 'express';
import { AppError } from '../lib/app-error.js';
import { redis } from '../lib/redis.js';

export interface RateLimitOptions {
  prefix: string;
  limit: number;
  windowSeconds: number;
  message?: string;
  keyFn?: (req: Request) => string;
}

/** Giới hạn tần suất dùng Redis để nhiều tiến trình dùng chung (NF-16). */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  return async (req, res, next) => {
    const scope = options.keyFn ? options.keyFn(req) : (req.ip ?? 'unknown');
    const key = `rl:${options.prefix}:${scope}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, options.windowSeconds);
    }

    if (count > options.limit) {
      const ttl = await redis.ttl(key);
      const retryAfter = ttl > 0 ? ttl : options.windowSeconds;
      res.setHeader('Retry-After', String(retryAfter));
      throw new AppError(
        'TOO_MANY_REQUESTS',
        429,
        options.message ?? `Bạn thao tác quá nhanh, vui lòng thử lại sau ${retryAfter} giây`,
        { retryAfterSeconds: retryAfter },
      );
    }

    next();
  };
}
