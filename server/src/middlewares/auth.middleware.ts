import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { config } from '../config/index.js';
import { AppError } from '../utils/app-error.js';

interface AccessClaims {
  sub: string;
  exp?: number;
}

/** Kiểm tra access token JWT (HS256) bằng `JWT_SECRET`. Trả `null` nếu token sai hoặc hết hạn. */
export function verifyAccessToken(token: string): AccessClaims | null {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature || !config.jwtSecret) return null;

  const expected = createHmac('sha256', config.jwtSecret).update(`${header}.${payload}`).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AccessClaims;
    if (!claims.sub) return null;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

function bearerClaims(authorization: string | undefined): AccessClaims | null {
  const header = authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token ? verifyAccessToken(token) : null;
}

/** Gán `res.locals['userId']` (string) cho route bắt buộc có access token hợp lệ. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const claims = bearerClaims(req.headers.authorization);
  if (!claims) {
    next(new AppError('UNAUTHORIZED', 401, 'Cần đăng nhập'));
    return;
  }
  res.locals['userId'] = claims.sub;
  next();
};

/**
 * Quyền `U`: gán `res.locals['userId']` (ObjectId) cho route cần khách đăng nhập.
 * Có access token hợp lệ thì dùng `sub` của token; chưa có thì dùng user cố định `DEV_USER_ID`
 * (chưa có đăng nhập, FR-02), chặn hẳn ở production.
 */
export const requireUser: RequestHandler = (req, res, next) => {
  const sub = bearerClaims(req.headers.authorization)?.sub;
  if (sub && Types.ObjectId.isValid(sub)) {
    res.locals['userId'] = new Types.ObjectId(sub);
    next();
    return;
  }
  if (config.isProduction || !Types.ObjectId.isValid(config.devUserId)) {
    next(new AppError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập'));
    return;
  }
  res.locals['userId'] = new Types.ObjectId(config.devUserId);
  next();
};
