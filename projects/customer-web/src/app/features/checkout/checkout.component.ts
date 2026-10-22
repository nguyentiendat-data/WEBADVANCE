import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AddressApiService,
  CatalogApiService,
  OrderApiService,
  type Address,
  type CheckoutItem,
  type CheckoutPreview,
  type CheckoutRequest,
  type DeliverySlot,
  type PublicConfig,
} from 'shared';
import { catchError, debounceTime, filter, finalize, firstValueFrom, of, switchMap } from 'rxjs';
import { clearBuyNow, readBuyNow, saveBuyNow, type BuyNowItem } from '../../core/cart/buy-now';
import { CartStore } from '../../core/cart/cart.store';
import { toApiError } from '../../core/http/api-error';
import { ToastService } from '../../core/toast/toast.service';
import { CompactHeaderComponent } from '../../layout/compact-header/compact-header.component';
import { VndPipe } from '../../shared/pipes/vnd.pipe';
import { QuantityStepperComponent } from '../../shared/ui/quantity-stepper/quantity-stepper.component';
import { CartLineComponent } from '../cart/cart-line/cart-line.component';
import {
  defaultPayment,
  formatDay,
  invoiceErrors,
  isPaymentAvailable,
  issueMessage,
  scheduleDates,
  toInvoiceInfo,
  toPaymentBody,
  type InvoiceErrors,
  type InvoiceForm,
  type PaymentOption,
} from './checkout-rules';

/** Chờ khách thao tác xong rồi mới tính lại đơn. */
const PREVIEW_DEBOUNCE_MS = 300;

const PHONE = /^(0|\+84)\d{9}$/;

/** Trang thanh toán (FR-31 → FR-39, FR-45; spec mục 3.2, 4.4). */
@Component({
  selector: 'app-checkout',
  imports: [
    ReactiveFormsModule,
    CompactHeaderComponent,
    CartLineComponent,
    QuantityStepperComponent,
    VndPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent {
  private readonly api = inject(OrderApiService);
  private readonly addressApi = inject(AddressApiService);
  protected readonly store = inject(CartStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly source =
    inject(ActivatedRoute).snapshot.queryParamMap.get('source') === 'buy-now' ? 'BUY_NOW' : 'CART';
  /** Sinh một lần khi vào trang; bấm Đặt hàng lại (mạng chập chờn) không tạo đơn trùng. */
  private readonly idempotencyKey = crypto.randomUUID();

  protected readonly config = toSignal(
    inject(CatalogApiService)
      .getPublicConfig()
      .pipe(catchError(() => of<PublicConfig | null>(null))),
    { initialValue: null },
  );

  // Mục 1: địa chỉ.
  protected readonly addresses = signal<Address[] | null>(null);
  protected readonly addressId = signal<string | null>(null);
  protected readonly addingAddress = signal(false);
  protected readonly savingAddress = signal(false);
  protected readonly addressForm = inject(FormBuilder).nonNullable.group({
    recipientName: ['', [Validators.required, Validators.maxLength(100)]],
    recipientPhone: ['', [Validators.required, Validators.pattern(PHONE)]],
    addressLine: ['', [Validators.required, Validators.maxLength(200)]],
    ward: ['', [Validators.required, Validators.maxLength(100)]],
    district: ['', Validators.maxLength(100)],
    province: ['', [Validators.required, Validators.maxLength(100)]],
  });
  protected readonly addressSubmitted = signal(false);

  // Mục 2: đơn tạm của Mua nhanh (nguồn giỏ sửa thẳng qua CartStore).
  protected readonly buyNowItems = signal<BuyNowItem[]>(readBuyNow());

  // Mục 3: giao hàng.
  protected readonly wantSchedule = signal(false);
  protected readonly scheduleDate = signal('');
  protected readonly scheduleSlot = signal<DeliverySlot>('MORNING');
  protected readonly note = signal('');

  // Mục 4: hóa đơn.
  protected readonly invoice = signal<InvoiceForm>({
    type: 'NONE',
    buyerName: '',
    taxCode: '',
    address: '',
    sendEmail: false,
    email: '',
  });
  private invoicePrefilled = false;

  // Mục 5: thanh toán.
  protected readonly payment = signal<PaymentOption | null>(null);

  protected readonly preview = signal<CheckoutPreview | null>(null);
  protected readonly previewing = signal(false);
  protected readonly previewError = signal<string | null>(null);
  private readonly refreshTick = signal(0);
  protected readonly placing = signal(false);
  protected readonly submitted = signal(false);
  /** Thông báo trên nút Đặt hàng, ví dụ giá vừa thay đổi. */
  protected readonly notice = signal<string | null>(null);

  private readonly request = computed<CheckoutRequest | null>(() => {
    this.refreshTick();
    if (this.addresses() === null) return null;
    const date = this.scheduleDate();
    const base: CheckoutRequest = {
      source: this.source,
      addressId: this.addressId(),
      delivery:
        this.wantSchedule() && date
          ? { scheduledDate: date, scheduledSlot: this.scheduleSlot() }
          : null,
    };
    if (this.source === 'BUY_NOW') return { ...base, items: this.buyNowItems() };
    // Mỗi lần giỏ đổi (sửa dòng ở mục 2) thì tính lại.
    return this.store.cart() ? base : null;
  });

  protected readonly cartLines = computed(() =>
    (this.store.cart()?.items ?? []).filter((i) => i.isSelected),
  );
  protected readonly itemCount = computed(() =>
    (this.preview()?.items ?? []).reduce((n, i) => n + i.quantity, 0),
  );
  protected readonly dateOptions = computed(() => {
    const d = this.preview()?.delivery;
    return scheduleDates(d?.minScheduleDate ?? null, d?.maxScheduleDate ?? null);
  });
  protected readonly slotOptions = computed(() => {
    const slots = this.config()?.shipping.slots ?? [
      { code: 'MORNING' as const, from: '08:00', to: '12:00' },
      { code: 'AFTERNOON' as const, from: '13:00', to: '17:00' },
    ];
    return slots.map((s) => ({
      code: s.code,
      label: `${s.code === 'MORNING' ? 'Sáng' : 'Chiều'} (${s.from}–${s.to})`,
    }));
  });
  protected readonly issues = computed(() => this.preview()?.blockingIssues ?? []);
  protected readonly issueOf = (code: string) => this.issues().find((i) => i.code === code);
  protected readonly invoiceErrors = computed<InvoiceErrors>(() => invoiceErrors(this.invoice()));
  protected readonly firstProblem = computed(() => {
    const p = this.preview();
    if (!p) return null;
    const issue = p.blockingIssues[0];
    if (issue) {
      const name = p.items.find((i) => i.variantId === issue.variantId)?.product.name;
      return issueMessage(issue, name);
    }
    if (Object.keys(this.invoiceErrors()).length) return 'Kiểm tra lại thông tin hóa đơn';
    if (!this.payment()) return 'Chọn phương thức thanh toán';
    return null;
  });
  protected readonly canPlace = computed(
    () => !!this.preview() && !this.previewing() && !this.placing() && !this.firstProblem(),
  );

  protected readonly formatDay = formatDay;
  protected readonly isPaymentAvailable = isPaymentAvailable;
  protected readonly issueMessage = issueMessage;

  constructor() {
    if (this.source === 'BUY_NOW' && this.buyNowItems().length === 0) {
      this.toast.error('Không còn sản phẩm mua ngay, vui lòng chọn lại.');
      void this.router.navigate(['/'], { replaceUrl: true });
      return;
    }
    if (this.source === 'CART') this.store.load();
    this.loadAddresses();

    toObservable(this.request)
      .pipe(
        filter((r): r is CheckoutRequest => r !== null),
        debounceTime(PREVIEW_DEBOUNCE_MS),
        switchMap((req) => {
          this.previewing.set(true);
          return this.api.preview(req).pipe(
            catchError((err: unknown) => {
              this.previewError.set(toApiError(err).message);
              return of(null);
            }),
            finalize(() => this.previewing.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((preview) => {
        if (preview) this.applyPreview(preview);
      });
  }

  private loadAddresses(): void {
    this.addressApi.list().subscribe({
      next: (list) => {
        this.addresses.set(list);
        // Server trả địa chỉ mặc định đứng đầu.
        this.addressId.set(list[0]?.id ?? null);
        this.addingAddress.set(list.length === 0);
      },
      error: (err: unknown) => {
        this.addresses.set([]);
        this.addingAddress.set(true);
        this.toast.error(toApiError(err).message);
      },
    });
  }

  private applyPreview(preview: CheckoutPreview): void {
    this.previewError.set(null);
    if (preview.blockingIssues.some((i) => i.code === 'NO_ITEMS')) {
      this.toast.error('Chưa có sản phẩm nào để thanh toán.');
      void this.router.navigate([this.source === 'CART' ? '/cart' : '/'], { replaceUrl: true });
      return;
    }
    this.preview.set(preview);

    // Tổng vượt hoặc tụt dưới ngưỡng cọc: phương án đang chọn không còn hợp lệ (spec mục 3.3).
    const current = this.payment();
    if (!current || !isPaymentAvailable(current, preview.payment)) {
      this.payment.set(defaultPayment(preview.payment));
      if (current) this.toast.success('Phương thức thanh toán đã đổi theo tổng tiền mới.');
    }

    const dates = scheduleDates(preview.delivery.minScheduleDate, preview.delivery.maxScheduleDate);
    if (!preview.delivery.schedulable) this.wantSchedule.set(false);
    else if (this.wantSchedule() && !dates.includes(this.scheduleDate())) {
      this.scheduleDate.set(dates[0] ?? '');
    }

    // BR-V06: điền sẵn từ lần xuất hóa đơn gần nhất, chỉ một lần.
    if (!this.invoicePrefilled) {
      this.invoicePrefilled = true;
      const last = preview.lastInvoiceInfo;
      if (last && last.type !== 'NONE') {
        this.invoice.set({
          type: last.type,
          buyerName: last.buyerName,
          taxCode: last.taxCode ?? '',
          address: last.address,
          sendEmail: last.sendEmail,
          email: last.email ?? '',
        });
      }
    }
  }

  protected refresh(): void {
    this.previewError.set(null);
    this.refreshTick.update((n) => n + 1);
  }

  // ---- Mục 1: địa chỉ ----

  protected selectAddress(id: string): void {
    this.addressId.set(id);
  }

  protected async saveAddress(): Promise<void> {
    this.addressSubmitted.set(true);
    if (this.addressForm.invalid) return;
    this.savingAddress.set(true);
    try {
      const { district, ...rest } = this.addressForm.getRawValue();
      const created = await firstValueFrom(
        this.addressApi.create({ ...rest, ...(district.trim() ? { district } : {}) }),
      );
      // Địa chỉ đầu tiên server tự đặt mặc định; tải lại để đúng thứ tự.
      const list = await firstValueFrom(this.addressApi.list());
      this.addresses.set(list);
      this.addressId.set(created.id);
      this.addingAddress.set(false);
      this.addressForm.reset();
      this.addressSubmitted.set(false);
    } catch (err) {
      this.toast.error(toApiError(err).message);
    } finally {
      this.savingAddress.set(false);
    }
  }

  protected addressInvalid(field: keyof typeof this.addressForm.controls): boolean {
    return this.addressSubmitted() && this.addressForm.controls[field].invalid;
  }

  protected addressText(a: {
    addressLine: string;
    ward: string;
    district?: string | null;
    province: string;
  }): string {
    return [a.addressLine, a.ward, a.district, a.province].filter(Boolean).join(', ');
  }

  // ---- Mục 2: sản phẩm (Mua nhanh) ----

  protected changeBuyNow(index: number, patch: Partial<BuyNowItem>): void {
    const items = this.buyNowItems().map((item, i) => (i === index ? { ...item, ...patch } : item));
    this.buyNowItems.set(items);
    saveBuyNow(items);
  }

  protected previewLine(variantId: string): CheckoutItem | undefined {
    return this.preview()?.items.find((i) => i.variantId === variantId);
  }

  protected variantText(item: CheckoutItem): string {
    const { color, material, dimensions } = item.variant;
    const size = dimensions ? `${dimensions.replaceAll('x', '×')} cm` : null;
    return [color, material, size].filter(Boolean).join(' / ');
  }

  // ---- Mục 3: giao hàng ----

  protected toggleSchedule(checked: boolean): void {
    this.wantSchedule.set(checked);
    if (checked && !this.scheduleDate()) this.scheduleDate.set(this.dateOptions()[0] ?? '');
  }

  // ---- Mục 4: hóa đơn ----

  protected setInvoice(patch: Partial<InvoiceForm>): void {
    const next = { ...this.invoice(), ...patch };
    // Chuyển sang Cá nhân lần đầu: điền sẵn họ tên người nhận (BR-V02).
    if (patch.type === 'PERSONAL' && !next.buyerName) {
      next.buyerName = this.preview()?.address?.recipientName ?? '';
    }
    this.invoice.set(next);
  }

  protected useShippingAddressForInvoice(): void {
    const address = this.preview()?.address;
    if (address) this.setInvoice({ address: this.addressText(address) });
  }

  protected invoiceError(field: keyof InvoiceForm): string | null {
    return this.submitted() ? (this.invoiceErrors()[field] ?? null) : null;
  }

  // ---- Đặt hàng ----

  protected async place(): Promise<void> {
    this.submitted.set(true);
    const preview = this.preview();
    const payment = this.payment();
    if (!preview || !payment || !this.canPlace()) return;

    this.placing.set(true);
    this.notice.set(null);
    try {
      const order = await firstValueFrom(
        this.api.create(
          {
            ...this.request()!,
            note: this.note().trim() || undefined,
            payment: toPaymentBody(payment),
            invoiceInfo: toInvoiceInfo(this.invoice()),
            expectedTotal: preview.summary.totalAmount,
          },
          this.idempotencyKey,
        ),
      );
      if (this.source === 'BUY_NOW') clearBuyNow();
      const page = order.payment.method === 'COD' ? 'success' : 'payment';
      // Tải lại giỏ (badge) sau khi rời trang, để giỏ vừa trống không kích hoạt preview "NO_ITEMS".
      await this.router.navigate(['/checkout', page, order.id], { replaceUrl: true });
      if (this.source === 'CART') this.store.load();
    } catch (err) {
      const error = toApiError(err);
      const fresh = (error.details as { preview?: CheckoutPreview } | undefined)?.preview;
      if (fresh) this.applyPreview(fresh);
      else this.refreshTick.update((n) => n + 1);
      if (error.code === 'PRICE_CHANGED' && fresh) {
        this.notice.set(
          `Giá đã thay đổi. Tổng mới là ${fresh.summary.totalAmount.toLocaleString('vi-VN')} VND, vui lòng kiểm tra rồi bấm Đặt hàng lại.`,
        );
      } else {
        this.toast.error(error.message);
      }
    } finally {
      this.placing.set(false);
    }
  }
}
