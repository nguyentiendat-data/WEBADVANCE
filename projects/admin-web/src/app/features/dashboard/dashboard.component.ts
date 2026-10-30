import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AdminAuthService } from '../../core/auth/admin-auth.service';
import { ROLE_LABELS } from '../../core/navigation/admin-nav.config';

/** Trang chủ tạm trong khung Admin; dashboard theo vai trò (AD-02...) làm ở các nhiệm vụ sau. */
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly auth = inject(AdminAuthService);

  readonly user = this.auth.user;
  readonly roleLabel = computed(() => ROLE_LABELS[this.user()?.roleName ?? ''] ?? 'Quản trị viên');
}
