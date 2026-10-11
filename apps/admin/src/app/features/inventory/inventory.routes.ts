import type { Routes } from '@angular/router';
import { INVENTORY_GATEWAY } from './models/inventory-gateway';
import { HttpInventoryGateway } from './services/http-inventory.gateway';
import { pendingInventoryGuard } from './state/pending-inventory.guard';
export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: INVENTORY_GATEWAY, useClass: HttpInventoryGateway }],
    children: [
      {
        path: '',
        title: 'Inventario · Pettly',
        loadComponent: () =>
          import('./pages/inventory-list.page').then(
            (m) => m.InventoryListPage,
          ),
      },
      {
        path: ':organizationId/variantes/:variantId',
        title: 'Existencias e historial · Pettly',
        canDeactivate: [pendingInventoryGuard],
        loadComponent: () =>
          import('./pages/inventory-detail.page').then(
            (m) => m.InventoryDetailPage,
          ),
      },
    ],
  },
];
