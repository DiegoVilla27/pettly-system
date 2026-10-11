import type { Routes } from '@angular/router';
import { superAdminGuard } from '../../core/auth';
import { CATALOG_GATEWAY } from './models/catalog-gateway';
import { HttpCatalogGateway } from './services/http-catalog.gateway';
export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: CATALOG_GATEWAY, useClass: HttpCatalogGateway }],
    children: [
      {
        path: '',
        title: 'Revisión de productos · Pettly',
        loadComponent: () =>
          import('./pages/moderation.page').then((m) => m.ModerationPage),
      },
      {
        path: 'productos/:productId',
        title: 'Revisar producto · Pettly',
        loadComponent: () =>
          import('./pages/product-review.page').then(
            (m) => m.ProductReviewPage,
          ),
      },
      {
        path: 'categorias',
        canMatch: [superAdminGuard],
        children: [
          {
            path: '',
            title: 'Categorías · Pettly',
            loadComponent: () =>
              import('./pages/categories.page').then((m) => m.CategoriesPage),
          },
          {
            path: 'crear',
            title: 'Crear categoría · Pettly',
            loadComponent: () =>
              import('./pages/category-create.page').then(
                (m) => m.CategoryCreatePage,
              ),
          },
          {
            path: ':categoryId',
            title: 'Editar categoría · Pettly',
            loadComponent: () =>
              import('./pages/category-detail.page').then(
                (m) => m.CategoryDetailPage,
              ),
          },
          {
            path: ':categoryId/auditoria',
            title: 'Auditoría de categoría · Pettly',
            loadComponent: () =>
              import('./pages/category-audit.page').then(
                (m) => m.CategoryAuditPage,
              ),
          },
        ],
      },
    ],
  },
];
