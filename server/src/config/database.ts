import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDatabase(): Promise<void> {
  if (!config.mongodbUri) {
    throw new Error('Thiếu biến môi trường MONGODB_URI');
  }

  mongoose.connection.on('error', (err) => {
    console.warn('Lỗi kết nối MongoDB:', err);
  });

  await mongoose.connect(config.mongodbUri);
  console.warn(`Đã kết nối MongoDB: ${mongoose.connection.name}`);
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
