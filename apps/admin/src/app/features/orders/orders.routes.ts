import type { Routes } from '@angular/router';
import { ORDERS_GATEWAY } from './models/orders-gateway';
import { HttpOrdersGateway } from './services/http-orders.gateway';
export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: ORDERS_GATEWAY, useClass: HttpOrdersGateway }],
    children: [
      {
        path: '',
        title: 'Pedidos · Pettly',
        loadComponent: () =>
          import('./pages/orders-list.page').then((m) => m.OrdersListPage),
      },
      {
        path: ':organizationId/:orderId',
        title: 'Detalle de pedido · Pettly',
        loadComponent: () =>
          import('./pages/order-detail.page').then((m) => m.OrderDetailPage),
      },
    ],
  },
];
