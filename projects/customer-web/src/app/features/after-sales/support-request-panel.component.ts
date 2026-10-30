import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { EligibleOrder, ReturnExchangeService, WarrantyCard } from 'shared';
import { inject } from '@angular/core';
import { ReturnFormComponent } from '../returns/return-form.component';
import { WarrantyFormComponent } from '../warranty/warranty-form.component';

type PanelKind = 'warranty' | 'return';

interface ReturnCandidate {
  orderId: string;
  orderCode: string;
  itemId: string;
  name: string;
  canReturn: boolean;
  deadline: string | null;
}

/** Bỏ dấu và hoa thường để tìm "ghe go" ra "Ghế gỗ". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Khung yêu cầu bảo hành / đổi trả xổ xuống ngay trên trang hỗ trợ: tìm sản phẩm, chọn sản phẩm
 * còn trong thời hạn, rồi nhập thông tin yêu cầu, không phải sang trang khác.
 */
@Component({
  selector: 'app-support-request-panel',
  imports: [DatePipe, RouterLink, WarrantyFormComponent, ReturnFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './support-request-panel.component.html',
  styleUrl: './support-request-panel.component.css',
})
export class SupportRequestPanelComponent {
  private readonly returns = inject(ReturnExchangeService);

  readonly kind = input.required<PanelKind>();
  readonly loggedIn = input(false);
  /** Phiếu bảo hành của khách; `undefined` đang tải, `null` tải lỗi. */
  readonly cards = input<WarrantyCard[] | null | undefined>();
  readonly presetCardId = input('');
  readonly closed = output<void>();
  readonly requestCreated = output<{ kind: PanelKind; id: string }>();

  protected readonly orderQuery = signal('');
  protected readonly nameQuery = signal('');
  protected readonly hasQuery = computed(() => !!(normalize(this.orderQuery()) || normalize(this.nameQuery())));
  protected readonly pickedCardId = signal('');
  protected readonly pickedItem = signal<ReturnCandidate | null>(null);

  protected readonly pickedCard = computed(() => {
    const id = this.pickedCardId() || this.presetCardId();
    const card = id ? (this.cards() ?? []).find((c) => c.id === id) : undefined;
    // Chỉ phiếu còn hạn mới được mở form (kể cả khi mở từ link có sẵn `card`).
    return card?.status === 'VALID' ? card : null;
  });

  protected readonly warrantyResults = computed(() => {
    const order = normalize(this.orderQuery());
    const name = normalize(this.nameQuery());
    return [...(this.cards() ?? [])]
      .sort((a, b) => Date.parse(b.activatedAt) - Date.parse(a.activatedAt))
      .filter(
        (card) =>
          (!order || normalize(card.orderCode).includes(order)) &&
          (!name || normalize(card.productName).includes(name)),
      );
  });

  /** Đơn đã giao kèm từng sản phẩm, chỉ tải khi mở khung đổi trả. */
  private readonly returnOrders = toSignal(
    combineLatest([toObservable(this.kind), toObservable(this.loggedIn)]).pipe(
      switchMap(([kind, loggedIn]) =>
        kind === 'return' && loggedIn
          ? this.returns.orders(1).pipe(
              switchMap((page) =>
                page.data.length
                  ? forkJoin(
                      page.data.map((order) =>
                        this.returns.order(order.id).pipe(catchError(() => of(null))),
                      ),
                    )
                  : of([] as (EligibleOrder | null)[]),
              ),
              map((orders) => orders.filter((order): order is EligibleOrder => !!order)),
              catchError(() => of(null)),
              startWith(undefined),
            )
          : of(undefined),
      ),
    ),
    { initialValue: undefined },
  );

  protected readonly returnResults = computed<ReturnCandidate[] | null | undefined>(() => {
    const orders = this.returnOrders();
    if (!orders) return orders as null | undefined;
    const order = normalize(this.orderQuery());
    const name = normalize(this.nameQuery());
    return orders
      .flatMap((order) =>
        order.items.map((item) => ({
          orderId: order.id,
          orderCode: order.orderCode,
          itemId: item.id,
          name: item.name,
          canReturn: item.actions.canReturn,
          deadline: order.returnDeadline,
        })),
      )
      .filter(
        (row) =>
          (!order || normalize(row.orderCode).includes(order)) &&
          (!name || normalize(row.name).includes(name)),
      );
  });

  protected search(order: string, name: string): void {
    this.orderQuery.set(order);
    this.nameQuery.set(name);
  }

  protected backToSearch(): void {
    this.pickedCardId.set('');
    this.pickedItem.set(null);
  }
}
