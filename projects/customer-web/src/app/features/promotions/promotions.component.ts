import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CatalogApiService, type FlashSale, type ProductListItem } from 'shared';
import { catchError, of } from 'rxjs';
import { CountdownComponent } from '../../shared/ui/countdown/countdown.component';
import { IconComponent } from '../../shared/ui/icons/icon.component';
import { ProductCardComponent } from '../../shared/ui/product-card/product-card.component';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-promotions',
  imports: [RouterLink, CountdownComponent, IconComponent, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.css',
})
export class PromotionsComponent {
  private readonly api = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly flashSale = toSignal(
    this.api.getFlashSale().pipe(catchError(() => of<FlashSale | null>(null))),
    { initialValue: null },
  );

  protected readonly products = signal<ProductListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  private page = 0;

  protected readonly hasMore = computed(() => this.products().length < this.total());

  /** Mức giảm cao nhất trong các sản phẩm của chương trình, dùng cho dòng mô tả. */
  protected readonly maxDiscount = computed(() => {
    const items = this.flashSale()?.products ?? [];
    return items.reduce(
      (max, { priceFrom, originalPriceFrom }) =>
        originalPriceFrom > priceFrom
          ? Math.max(max, Math.round((1 - priceFrom / originalPriceFrom) * 100))
          : max,
      0,
    );
  });

  constructor() {
    this.loadMore();
  }

  protected loadMore(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api
      .getProducts({ hasPromotion: true, page: this.page + 1, limit: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ items, meta }) => {
          this.page = meta.page;
          this.total.set(meta.total);
          this.products.update((current) => [...current, ...items]);
          this.loading.set(false);
        },
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }
}
