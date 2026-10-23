import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApiService, type CollectionDetail } from 'shared';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { IconComponent } from '../../../shared/ui/icons/icon.component';
import { ProductCardComponent } from '../../../shared/ui/product-card/product-card.component';

/** `null` khi tải lỗi, `undefined` khi đang tải. */
type CollectionState = CollectionDetail | null | undefined;

@Component({
  selector: 'app-collection-detail',
  imports: [RouterLink, IconComponent, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './collection-detail.component.html',
  styleUrl: './collection-detail.component.css',
})
export class CollectionDetailComponent {
  private readonly api = inject(CatalogApiService);

  /** Tải lại khi đổi slug trên URL. */
  protected readonly collection = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => params.get('slug') ?? ''),
      switchMap((slug) =>
        this.api.getCollection(slug).pipe(
          map((detail): CollectionState => detail),
          catchError(() => of<CollectionState>(null)),
          startWith<CollectionState>(undefined),
        ),
      ),
    ),
    { initialValue: undefined as CollectionState },
  );
}
