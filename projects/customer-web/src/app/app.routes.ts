import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  {
    path: 'promotions',
    loadChildren: () =>
      import('./features/promotions/promotions.routes').then((m) => m.PROMOTIONS_ROUTES),
  },
  {
    path: 'collections',
    loadChildren: () =>
      import('./features/collections/collections.routes').then((m) => m.COLLECTION_ROUTES),
  },
  {
    path: 'inspirations',
    loadChildren: () =>
      import('./features/inspirations/inspirations.routes').then((m) => m.INSPIRATIONS_ROUTES),
  },
  {
    path: 'view-your-room',
    loadChildren: () =>
      import('./features/view-your-room/view-your-room.routes').then(
        (m) => m.VIEW_YOUR_ROOM_ROUTES,
      ),
  },
  {
    path: 'fit-your-home',
    loadChildren: () =>
      import('./features/fit-your-home/fit-your-home.routes').then((m) => m.FIT_YOUR_HOME_ROUTES),
  },
  {
    path: 'cart',
    loadChildren: () => import('./features/cart/cart.routes').then((m) => m.CART_ROUTES),
  },
  {
    path: 'checkout',
    loadChildren: () =>
      import('./features/checkout/checkout.routes').then((m) => m.CHECKOUT_ROUTES),
  },
  // Các trang chưa làm (sản phẩm, tìm kiếm, tài khoản...) tạm đưa về trang chủ.
  { path: '**', redirectTo: '' },
];
