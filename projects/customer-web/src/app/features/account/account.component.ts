import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import type { RoleName } from 'shared';

const ROLE_LABELS: Record<RoleName, string> = {
  CUSTOMER: 'Khách hàng',
  SUPER_ADMIN: 'Quản trị viên cấp cao',
  PRODUCT_ADMIN: 'Quản trị sản phẩm',
  MARKETING_ADMIN: 'Quản trị marketing',
  ORDER_ADMIN: 'Quản trị đơn hàng',
};

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountComponent {
  protected readonly auth = inject(AuthService);

  readonly roleLabel = computed(() => {
    const role = this.auth.user()?.roleName;
    return role ? ROLE_LABELS[role] : '';
  });

  readonly contact = computed(
    () => this.auth.user()?.email ?? this.auth.user()?.phoneNumber ?? '—',
  );
}
