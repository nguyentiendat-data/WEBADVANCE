import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/api-error';
import { VariantPickerService } from '../../../../core/cart/variant-picker.service';
import { CollectionWishlistService } from '../../../../core/shopping/collection-wishlist.service';
import { AccountApiService, type WishlistItem } from '../../account-api.service';
import { AccountIconComponent } from '../../account-icon.component';
import { ToastService } from '../../../../core/toast/toast.service';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, AccountIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css',
})
export class WishlistComponent {
  private readonly toast = inject(ToastService);
  private readonly api = inject(AccountApiService);
  private readonly picker = inject(VariantPickerService);
  private readonly wishlist = inject(CollectionWishlistService);

  protected readonly products = signal<WishlistItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly notice = signal<{ text: string; error: boolean } | null>(null);

  constructor() {
    this.api.wishlist().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected remove(product: WishlistItem): void {
    this.wishlist.toggle(product.id);
    this.products.update((items) => items.filter((item) => item.id !== product.id));
    this.toast.success(`Đã bỏ ${product.name} khỏi danh sách yêu thích.`);
  }

  /** Mở popup chọn mẫu giống nút thêm giỏ ở thẻ sản phẩm. */
  protected addToCart(product: WishlistItem, mode: 'add' | 'buy' = 'add'): void {
    this.picker.open({ mode, slug: product.slug });
  }

  protected formatPrice(price: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(price)} VNĐ`;
  }
}
