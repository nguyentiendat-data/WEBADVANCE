import path from 'node:path';
import express from 'express';
import { config } from './config/index.js';

const app = express();
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/uploads', express.static(path.resolve('uploads')));
app.use('/admin', express.static(path.resolve('dist/admin-web/browser')));
app.use(express.static(path.resolve('dist/customer-web/browser')));

app.listen(config.port, () => {
  console.warn(`API đang chạy ở cổng ${config.port}`);
});
