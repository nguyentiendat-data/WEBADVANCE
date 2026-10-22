// Mô phỏng ngân hàng báo tiền về (dev/demo QR, spec mục 5).
// Dùng: npm run bank:simulate -- <nội dung CK> <số tiền> [mã giao dịch]
// Ví dụ: npm run bank:simulate -- CV261017-0001-K7Q2 14350000
import 'dotenv/config';

const [content, amount, code] = process.argv.slice(2);
if (!content || !amount) {
  console.warn('Dùng: npm run bank:simulate -- <nội dung CK> <số tiền> [mã giao dịch]');
  process.exit(1);
}

async function main(): Promise<void> {
  const base = process.env['API_URL'] ?? `http://localhost:${process.env['PORT'] ?? 3000}`;
  const res = await fetch(`${base}/api/v1/webhooks/bank-transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': process.env['BANK_WEBHOOK_SECRET'] ?? '',
    },
    body: JSON.stringify({
      transactionCode: code ?? `FT${Date.now()}`,
      amount: Number(amount),
      content,
      transactionAt: new Date().toISOString(),
    }),
  });
  console.warn(res.status, await res.text());
}

main().catch((err: unknown) => {
  console.warn('Không gọi được webhook:', err);
  process.exit(1);
});
