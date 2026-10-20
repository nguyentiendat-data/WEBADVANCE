import path from 'node:path';
import express from 'express';
import { config } from './config/index.js';
import { connectDatabase, isDatabaseConnected } from './config/database.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { apiRoutes } from './modules/routes.js';

const app = express();
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', database: isDatabaseConnected() ? 'connected' : 'disconnected' },
  });
});

app.use('/api/v1', apiRoutes);
app.use('/api', notFoundHandler);

app.use('/uploads', express.static(path.resolve('uploads')));
app.use('/admin', express.static(path.resolve('dist/admin-web/browser')));
app.use(express.static(path.resolve('dist/customer-web/browser')));

app.use(errorHandler);

async function start(): Promise<void> {
  await connectDatabase();

  app.listen(config.port, () => {
    console.warn(`API đang chạy ở cổng ${config.port}`);
  });
}

start().catch((err: unknown) => {
  console.warn('Không khởi động được API:', err);
  process.exit(1);
});
