import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
export const AFTER_SALES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      (route, state) =>
        route.queryParamMap.get('view') === 'requests'
          ? authGuard(route, state)
          : true,
    ],
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    loadComponent: () => import('./after-sales.component').then((m) => m.AfterSalesComponent),
  },
];
