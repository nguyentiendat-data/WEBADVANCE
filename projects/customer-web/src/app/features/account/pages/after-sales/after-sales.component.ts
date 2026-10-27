import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReturnExchangeService, WarrantyService } from 'shared';
import { catchError, combineLatest, of, startWith, Subject, switchMap } from 'rxjs';
import { STATUS_LABELS } from '../../../../shared/ui/request-timeline/request-timeline.component';

type Tab = 'warranty' | 'returns';

/** Theo dõi yêu cầu bảo hành và đổi trả của khách; tạo yêu cầu mới đi từ đơn hàng đã giao. */
@Component({
  selector: 'app-account-after-sales',
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './after-sales.component.html',
  styleUrl: './after-sales.component.css',
})
export class AfterSalesComponent {
  private readonly warrantyApi = inject(WarrantyService);
  private readonly returnsApi = inject(ReturnExchangeService);

  protected readonly labels = STATUS_LABELS;
  protected readonly tab = signal<Tab>('warranty');
  protected readonly warrantyPage = signal(1);
  protected readonly returnsPage = signal(1);
  protected readonly retry = new Subject<number>();

  protected readonly warranty = toSignal(
    combineLatest([toObservable(this.warrantyPage), this.retry.pipe(startWith(0))]).pipe(
      switchMap(([page]) => this.warrantyApi.list(page).pipe(catchError(() => of(null)), startWith(undefined))),
    ),
  );
  protected readonly returns = toSignal(
    combineLatest([toObservable(this.returnsPage), this.retry.pipe(startWith(0))]).pipe(
      switchMap(([page]) => this.returnsApi.list(page).pipe(catchError(() => of(null)), startWith(undefined))),
    ),
  );
}
