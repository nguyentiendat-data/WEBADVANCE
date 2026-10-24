import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// lazyConnect: chỉ nối Redis khi một endpoint đăng nhập thật sự dùng tới, để API vẫn chạy được ở
// máy chưa cài Redis (giỏ hàng, sản phẩm… không cần Redis).
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Đã kết nối Redis'));
redis.on('error', (error) => logger.error({ err: error }, 'Lỗi kết nối Redis'));

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
