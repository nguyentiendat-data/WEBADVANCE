import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CartItem } from 'shared';
import { CartStore } from '../../../core/cart/cart.store';
import { VariantPickerService } from '../../../core/cart/variant-picker.service';
import { toApiError } from '../../../core/http/api-error';
import { ToastService } from '../../../core/toast/toast.service';
import { VndPipe } from '../../../shared/pipes/vnd.pipe';
import { IconComponent } from '../../../shared/ui/icons/icon.component';
import { QuantityStepperComponent } from '../../../shared/ui/quantity-stepper/quantity-stepper.component';
import { isBlocking } from '../cart-rules';

/** Chờ khách bấm xong rồi mới gửi số lượng, tránh mỗi lần bấm một request. */
const QUANTITY_DEBOUNCE_MS = 400;

/** Một dòng trong giỏ (spec giỏ hàng mục 4.3). Tự gọi store, lỗi thì hoàn tác và báo toast. */
@Component({
  selector: 'app-cart-line',
  imports: [RouterLink, IconComponent, QuantityStepperComponent, VndPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-line.component.html',
  styleUrl: './cart-line.component.css',
  host: {
    '[class.saving]': 'saving()',
    '[class.inactive]': 'inactive()',
    '[class.no-select]': '!selectable()',
  },
})
export class CartLineComponent {
  private readonly store = inject(CartStore);
  private readonly toast = inject(ToastService);
  private readonly picker = inject(VariantPickerService);

  readonly item = input.required<CartItem>();
  /** Trang thanh toán ẩn ô chọn: dòng hiện ở đó đều đang được chọn. */
  readonly selectable = input(true);

  /** Số lượng khách vừa bấm, chưa gửi lên server. */
  private readonly pendingQuantity = signal<number | null>(null);
  protected readonly saving = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly quantity = computed(() => this.pendingQuantity() ?? this.item().quantity);
  protected readonly blocked = computed(() => isBlocking(this.item().warnings));
  protected readonly inactive = computed(() =>
    this.item().warnings.some((w) => w === 'OUT_OF_STOCK' || w === 'VARIANT_UNAVAILABLE'),
  );
  protected readonly has = (warning: CartItem['warnings'][number]): boolean =>
    this.item().warnings.includes(warning);

  protected readonly variantText = computed(() => {
    const { color, material, dimensions } = this.item().variant;
    // API trả "220x95x85" (cm); hiển thị giống popup chọn biến thể: "220×95×85 cm".
    const size = dimensions ? `${dimensions.replaceAll('x', '×')} cm` : null;
    return [color, material, size].filter(Boolean).join(' / ');
  });

  /** Giá gốc gạch ngang, cùng con số với thẻ sản phẩm và popup chọn biến thể. */
  protected readonly originalPrice = computed(() => {
    const { variant, currentPrice } = this.item();
    return variant.originalPrice > currentPrice ? variant.originalPrice : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected changeQuantity(value: number): void {
    this.pendingQuantity.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.save({ quantity: value }).finally(() => this.pendingQuantity.set(null));
    }, QUANTITY_DEBOUNCE_MS);
  }

  /** BR-C04: giảm về đúng số còn lại và chọn lại dòng trong một lần gửi. */
  protected reduceToAvailable(): void {
    const available = this.item().available;
    if (available) void this.save({ quantity: available, isSelected: true });
  }

  protected toggleSelected(box: HTMLInputElement): void {
    void this.save({ isSelected: box.checked }, () => (box.checked = this.item().isSelected));
  }

  protected toggleInstallation(box: HTMLInputElement): void {
    void this.save(
      { hasInstallation: box.checked },
      () => (box.checked = this.item().hasInstallation),
    );
  }

  protected changeVariant(): void {
    const item = this.item();
    this.picker.open({
      mode: 'update',
      slug: item.product.slug,
      itemId: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      hasInstallation: item.hasInstallation,
    });
  }

  protected async remove(): Promise<void> {
    if (!confirm(`Xóa "${this.item().product.name}" khỏi giỏ hàng?`)) return;
    this.saving.set(true);
    try {
      await this.store.remove(this.item().id);
    } catch (err) {
      this.toast.error(toApiError(err).message);
      this.saving.set(false);
    }
  }

  /**
   * Lỗi thì server không đổi gì, store giữ dữ liệu cũ. Số lượng tự hiển thị lại theo store;
   * checkbox thì DOM đã đổi theo cú bấm nên cần `revert` đặt lại.
   */
  private async save(body: Parameters<CartStore['update']>[1], revert?: () => void): Promise<void> {
    this.saving.set(true);
    try {
      await this.store.update(this.item().id, body);
    } catch (err) {
      revert?.();
      this.toast.error(toApiError(err).message);
    } finally {
      this.saving.set(false);
    }
  }
}
