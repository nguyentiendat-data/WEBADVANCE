export type ErrorDetails = unknown;

/**
 * Lỗi nghiệp vụ có mã lỗi theo docs/api-design.md mục 0.4.
 * Middleware `error` sẽ chuẩn hóa thành response.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
