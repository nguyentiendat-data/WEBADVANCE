import { Schema, model, type Types } from 'mongoose';

export type VoucherType = 'PUBLIC' | 'COLLECTIBLE' | 'ASSIGNED';
export type CustomerGroup = 'ALL' | 'NEW_CUSTOMER' | 'BIRTHDAY_MONTH';

export interface VoucherScope {
  productId?: Types.ObjectId;
  categoryId?: Types.ObjectId;
}

export interface VoucherDoc {
  _id: Types.ObjectId;
  promotionId?: Types.ObjectId;
  code: string;
  name?: string;
  type: VoucherType;
  customerGroup: CustomerGroup;
  /** Cho phép cộng với khuyến mãi; `false` thì dòng đang khuyến mãi không được giảm thêm. */
  stackableWithPromotion: boolean;
  discountType: 'PERCENT' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountValue?: number | null;
  /** Giá trị đơn tối thiểu, tính sau khuyến mãi. */
  minOrderValue?: number | null;
  /** Rỗng là áp dụng toàn đơn. */
  scope: VoucherScope[];
  totalUsageLimit?: number | null;
  perUserLimit: number;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED';
}

const voucherSchema = new Schema<VoucherDoc>(
  {
    promotionId: { type: Schema.Types.ObjectId, ref: 'promotions' },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: String,
    type: { type: String, required: true, enum: ['PUBLIC', 'COLLECTIBLE', 'ASSIGNED'] },
    customerGroup: {
      type: String,
      enum: ['ALL', 'NEW_CUSTOMER', 'BIRTHDAY_MONTH'],
      default: 'ALL',
    },
    stackableWithPromotion: { type: Boolean, default: false },
    discountType: { type: String, required: true, enum: ['PERCENT', 'FIXED_AMOUNT'] },
    discountValue: { type: Number, required: true },
    maxDiscountValue: Number,
    minOrderValue: Number,
    scope: [
      {
        _id: false,
        productId: { type: Schema.Types.ObjectId, ref: 'products' },
        categoryId: { type: Schema.Types.ObjectId, ref: 'categories' },
      },
    ],
    totalUsageLimit: Number,
    perUserLimit: { type: Number, required: true, default: 1 },
    usedCount: { type: Number, required: true, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, required: true, enum: ['ACTIVE', 'PAUSED', 'EXPIRED'] },
  },
  { timestamps: true },
);

export const VoucherModel = model<VoucherDoc>('vouchers', voucherSchema);
