import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
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

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const claims = token ? verifyAccessToken(token) : null;
  if (!claims) {
    next(new AppError('UNAUTHORIZED', 401, 'Cần đăng nhập'));
    return;
  }
  res.locals['userId'] = claims.sub;
  next();
};
