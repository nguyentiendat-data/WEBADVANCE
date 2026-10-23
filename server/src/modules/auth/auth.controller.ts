import type { RequestHandler } from 'express';
import { AppError } from '../../lib/app-error.js';
import {
  getCurrentUser,
  login,
  register,
  resetPassword,
  type AuthResult,
} from './auth.service.js';
import type { LoginBody, RegisterBody, ResetPasswordBody } from './auth.schema.js';
import { linkGoogle, loginWithGoogle, requestGoogleLinkOtp } from './google.service.js';
import { sendOtp, verifyOtp, type SendOtpInput } from './otp.service.js';
import { readRefreshToken, revokeSession, rotateSession } from './token.service.js';

function success<T>(data: T, message?: string) {
  return { success: true as const, data, ...(message ? { message } : {}) };
}

export const sendOtpHandler: RequestHandler = async (req, res) => {
  const body = req.body as SendOtpInput;
  const result = await sendOtp(body);

  // Không bao giờ trả mã OTP ra response.
  res.status(200).json(
    success({
      otpId: result.otpId,
      expiresAt: result.expiresAt,
      resendAvailableAt: result.resendAvailableAt,
    }),
  );
};

export const verifyOtpHandler: RequestHandler = async (req, res) => {
  const { otpId, code } = req.body as { otpId: string; code: string };
  const result = await verifyOtp(otpId, code);
  res.status(200).json(success(result));
};

export const registerHandler: RequestHandler = async (req, res) => {
  const result = await register(req.body as RegisterBody, res);
  res.status(201).json(success<AuthResult>(result, 'Đăng ký thành công'));
};

export const loginHandler: RequestHandler = async (req, res) => {
  const result = await login(req.body as LoginBody, res);
  res.status(200).json(success<AuthResult>(result, 'Đăng nhập thành công'));
};

export const refreshHandler: RequestHandler = async (req, res) => {
  const rawToken = readRefreshToken(req);
  if (!rawToken) {
    throw new AppError('SESSION_EXPIRED', 401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
  }

  const accessToken = await rotateSession(rawToken, res);
  res.status(200).json(success({ accessToken }));
};

export const logoutHandler: RequestHandler = async (req, res) => {
  const rawToken = readRefreshToken(req);
  if (rawToken) {
    await revokeSession(rawToken, res);
  }
  res.status(200).json(success({ loggedOut: true }, 'Đã đăng xuất'));
};

export const meHandler: RequestHandler = async (req, res) => {
  const user = await getCurrentUser(req.user!.id);
  res.status(200).json(success({ user }));
};

export const resetPasswordHandler: RequestHandler = async (req, res) => {
  const { otpId, newPassword } = req.body as ResetPasswordBody;
  await resetPassword(otpId, newPassword);
  res.status(200).json(success({ reset: true }, 'Đặt lại mật khẩu thành công'));
};

export const googleLoginHandler: RequestHandler = async (req, res) => {
  const { idToken } = req.body as { idToken: string };
  const result = await loginWithGoogle(idToken, res);
  res.status(200).json(success(result, 'Đăng nhập bằng Google thành công'));
};

export const googleLinkOtpHandler: RequestHandler = async (req, res) => {
  const { linkToken } = req.body as { linkToken: string };
  const result = await requestGoogleLinkOtp(linkToken);
  res.status(200).json(success(result, 'Đã gửi mã xác thực tới email của tài khoản'));
};

export const googleLinkHandler: RequestHandler = async (req, res) => {
  const result = await linkGoogle(req.body as { linkToken: string; password?: string; otpId?: string }, res);
  res.status(200).json(success(result, 'Liên kết tài khoản Google thành công'));
};
