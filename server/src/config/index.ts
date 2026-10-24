import 'dotenv/config';

export const config = {
  port: Number(process.env['PORT'] ?? 3000),
  mongodbUri: process.env['MONGODB_URI'] ?? '',
  redisUrl: process.env['REDIS_URL'] ?? '',
  jwtSecret: process.env['JWT_SECRET'] ?? '',
  cookieSecret: process.env['COOKIE_SECRET'] ?? '',
  resendApiKey: process.env['RESEND_API_KEY'] ?? '',
  geminiApiKey: process.env['GEMINI_API_KEY'] ?? '',
  googleClientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
  bankWebhookSecret: process.env['BANK_WEBHOOK_SECRET'] ?? '',
  isProduction: process.env['NODE_ENV'] === 'production',
  /** Khách chưa gửi token: request được coi là của user này (chỉ ngoài production). */
  devUserId: process.env['DEV_USER_ID'] || '000000000000000000000001',
  otpEmailFrom: process.env['OTP_EMAIL_FROM'] ?? 'CaraVeso <onboarding@resend.dev>',
  /** Origin được gọi các endpoint dùng cookie (refresh, logout). */
  allowedOrigins: (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:4200,http://localhost:4201')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  firebaseProjectId: process.env['FIREBASE_PROJECT_ID'],
  firebaseClientEmail: process.env['FIREBASE_CLIENT_EMAIL'],
  firebasePrivateKey: process.env['FIREBASE_PRIVATE_KEY'],
  googleApplicationCredentials: process.env['GOOGLE_APPLICATION_CREDENTIALS'],
  accessTokenTtl: '15m' as const,
  customerRefreshTtlSeconds: 7 * 24 * 60 * 60,
  adminRefreshTtlSeconds: 30 * 60,
};
