import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  // Các trang chưa làm (sản phẩm, tìm kiếm, giỏ hàng...) tạm đưa về trang chủ.
  { path: '**', redirectTo: '' },
];
