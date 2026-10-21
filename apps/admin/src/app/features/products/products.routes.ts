import type { Routes } from '@angular/router';
import { PRODUCTS_GATEWAY } from './models/products-gateway';
import { HttpProductsGateway } from './services/http-products.gateway';
export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: PRODUCTS_GATEWAY, useClass: HttpProductsGateway }],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Productos de empresa · Pettly',
        loadComponent: () =>
          import('./pages/products-list.page').then((m) => m.ProductsListPage),
      },
      {
        path: ':organizationId/nuevo',
        title: 'Crear producto · Pettly',
        loadComponent: () =>
          import('./pages/product-create.page').then(
            (m) => m.ProductCreatePage,
          ),
      },
      {
        path: ':organizationId/:productId',
        title: 'Gestionar producto · Pettly',
        loadComponent: () =>
          import('./pages/product-detail.page').then(
            (m) => m.ProductDetailPage,
          ),
      },
    ],
  },
];
