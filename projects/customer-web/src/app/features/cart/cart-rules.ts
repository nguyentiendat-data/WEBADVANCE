import type { CartItem } from 'shared';

/** Cảnh báo khiến dòng không được chọn để thanh toán, khớp server (BR-C01, BR-C04, BR-C05). */
const BLOCKING: CartItem['warnings'] = ['VARIANT_UNAVAILABLE', 'OUT_OF_STOCK', 'EXCEEDS_STOCK'];

export function isBlocking(warnings: CartItem['warnings']): boolean {
  return warnings.some((w) => BLOCKING.includes(w));
}
