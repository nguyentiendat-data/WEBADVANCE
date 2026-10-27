import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { ApiResponse } from 'shared';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../toast/toast.service';

const API = '/api/v1/users/me/wishlist';

/**
 * Yêu thích của khách đăng nhập, lưu trên server (FR-09, FR-22). Khách chưa đăng nhập bấm tim
 * thì được đưa tới trang đăng nhập rồi quay lại đúng trang đang xem.
 */
@Injectable({ providedIn: 'root' })
export class CollectionWishlistService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Id các sản phẩm đang yêu thích. */
  readonly ids = signal<string[]>([]);

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.ids.set([]);
        return;
      }
      this.http.get<ApiResponse<{ id: string }[]>>(API).subscribe({
        next: (response) => this.ids.set(response.data.map((item) => item.id)),
        error: () => this.ids.set([]),
      });
    });
  }

  toggle(id: string): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const saved = this.ids().includes(id);
    // Cập nhật ngay cho nhanh, lỗi thì trả về như cũ.
    this.ids.update((ids) => (saved ? ids.filter((value) => value !== id) : [...ids, id]));
    const request = saved ? this.http.delete(`${API}/${id}`) : this.http.post(API, { productId: id });
    request.subscribe({
      error: () => {
        this.ids.update((ids) => (saved ? [...ids, id] : ids.filter((value) => value !== id)));
        this.toast.error('Không cập nhật được danh sách yêu thích.');
      },
    });
  }
}
