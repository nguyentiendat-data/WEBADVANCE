import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { SearchUiService } from '../../core/search/search-ui.service';
import { IconComponent } from '../../shared/ui/icons/icon.component';

/** Cuộn quá ngưỡng này (px) thì hiện nút về đầu trang. */
const SHOW_TOP_THRESHOLD = 400;

/** Nút nổi: tìm kiếm và AI ở giữa chân trang, chat CSKH và về đầu trang ở góc phải. */
@Component({
  selector: 'app-floating-actions',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onScroll()' },
  templateUrl: './floating-actions.component.html',
  styleUrl: './floating-actions.component.css',
})
export class FloatingActionsComponent {
  /** Hiện cụm nút Search và AI ở giữa chân trang. */
  readonly showDock = input(true);

  private readonly search = inject(SearchUiService);

  protected readonly showTop = signal(false);

  protected onScroll(): void {
    this.showTop.set(window.scrollY > SHOW_TOP_THRESHOLD);
  }

  protected openSearch(): void {
    this.search.openSearch();
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
