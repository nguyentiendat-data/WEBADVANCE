import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { CatalogApiService, type Category } from 'shared';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CartStore } from '../../core/cart/cart.store';
import { ProductSearchService } from '../../core/search/product-search.service';
import { SearchUiService } from '../../core/search/search-ui.service';
import { IconComponent } from '../../shared/ui/icons/icon.component';

/** Cuộn quá ngưỡng này (px) thì header đổi sang nền trắng. */
const SCROLL_THRESHOLD = 24;

@Component({
  selector: 'app-header',
  imports: [RouterLink, IconComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.solid]': '!isHome() || solid()',
    '[class.scrolled]': 'scrolled()',
    '[class.menu-open]': 'menuOpen()',
    '[class.search-open]': 'search.open()',
    '(window:scroll)': 'onScroll()',
  },
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  private readonly api = inject(CatalogApiService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  /** Nền trắng chữ đen ngay từ đầu, cho trang không có ảnh lớn đầu trang (giỏ hàng). */
  readonly solid = input(false);

  protected readonly search = inject(SearchUiService);
  protected readonly searchData = inject(ProductSearchService);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly suggestions = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) =>
        q.trim()
          ? this.searchData.suggestions(q.trim()).pipe(catchError(() => of<string[]>([])))
          : of<string[]>([]),
      ),
    ),
    { initialValue: [] as string[] },
  );
  protected readonly cart = inject(CartStore);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  /** Chỉ trang chủ có header trong suốt đè lên banner; các trang khác header luôn nền trắng. */
  protected readonly isHome = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split(/[?#]/)[0] === '/'),
    ),
    { initialValue: this.router.url.split(/[?#]/)[0] === '/' },
  );

  private readonly categories = toSignal(
    this.api.getCategories().pipe(catchError(() => of<Category[]>([]))),
    { initialValue: [] as Category[] },
  );

  protected readonly productCategories = () =>
    this.categories().filter((c) => c.type === 'PRODUCT_CATEGORY');
  protected readonly rooms = () => this.categories().filter((c) => c.type === 'ROOM');

  constructor() {
    this.cart.ensureLoaded();

    // Có yêu cầu mở tìm kiếm (từ header hoặc nút nổi ở chân trang): thu menu, đưa con trỏ vào ô.
    effect(() => {
      if (this.search.focusRequest() === 0) return;
      this.menuOpen.set(false);
      setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
    });
  }

  protected onSearchFocusOut(event: FocusEvent, form: HTMLElement): void {
    if (!form.contains(event.relatedTarget as Node | null)) this.search.closeSearch();
  }

  protected submitSearch(value = this.searchControl.value): void {
    const q = value.trim();
    this.searchData.remember(q);
    this.searchControl.setValue(q);
    this.closeSearch();
    void this.router.navigate(['/search'], { queryParams: { q: q || null } });
  }

  protected closeSearch(): void {
    this.search.closeSearch();
    this.searchInput()?.nativeElement.blur();
  }

  protected onScroll(): void {
    this.scrolled.set(window.scrollY > SCROLL_THRESHOLD);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
