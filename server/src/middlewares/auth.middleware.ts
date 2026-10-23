import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../lib/app-error.js';
import { UserStatus, type RoleName } from '../lib/shared-enums.js';
import { RoleModel, UserModel, type IRole } from '../modules/auth/auth.model.js';

export interface AuthenticatedUser {
  id: string;
  roleName: RoleName;
  mustChangePassword: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface AccessTokenPayload extends jwt.JwtPayload {
  sub: string;
  role: RoleName;
  mustChangePassword: boolean;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new AppError('UNAUTHORIZED', 401, 'Bạn chưa đăng nhập');
  }

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET) as AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('TOKEN_EXPIRED', 401, 'Phiên đăng nhập đã hết hạn');
    }
    throw new AppError('UNAUTHORIZED', 401, 'Token không hợp lệ');
  }

  const user = await UserModel.findById(payload.sub).populate<{ roleId: IRole }>('roleId', 'name');
  if (!user) {
    throw new AppError('UNAUTHORIZED', 401, 'Tài khoản không tồn tại');
  }

  if (user.status === UserStatus.LOCKED) {
    throw new AppError(
      'ACCOUNT_LOCKED_BY_ADMIN',
      403,
      user.lockInfo?.reason || 'Tài khoản đã bị khóa bởi quản trị viên',
    );
  }

  if (user.status === UserStatus.ANONYMIZED) {
    throw new AppError('UNAUTHORIZED', 401, 'Tài khoản đã bị xóa');
  }

  if (user.security.mustChangePassword && !req.path.endsWith('/auth/change-password')) {
    throw new AppError('MUST_CHANGE_PASSWORD', 403, 'Bạn phải đổi mật khẩu trước khi tiếp tục');
  }

  req.user = {
    id: String(user._id),
    roleName: user.roleId?.name as RoleName,
    mustChangePassword: user.security.mustChangePassword,
  };

  next();
};

/** Chỉ cho phép Origin thuộc danh sách cấu hình (chống CSRF cho endpoint dùng cookie). */
export const checkOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin;
  if (origin && !config.allowedOrigins.includes(origin)) {
    throw new AppError('FORBIDDEN', 403, 'Origin không được phép');
  }
  next();
};

export function getClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
