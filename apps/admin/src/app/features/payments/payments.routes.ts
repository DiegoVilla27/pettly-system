import type { Routes } from '@angular/router';
import { PAYMENTS_GATEWAY } from './models/payments-gateway';
import { HttpPaymentsGateway } from './services/http-payments.gateway';
import { superAdminGuard } from '../../core/auth';
export const PAYMENTS_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: PAYMENTS_GATEWAY, useClass: HttpPaymentsGateway }],
    children: [
      {
        path: '',
        title: 'Pagos · Pettly',
        loadComponent: () =>
          import('./pages/payments-list.page').then((m) => m.PaymentsListPage),
      },
      {
        path: 'plataforma/:paymentId',
        canMatch: [superAdminGuard],
        title: 'Pago · Pettly',
        loadComponent: () =>
          import('./pages/payment-detail.page').then(
            (m) => m.PaymentDetailPage,
          ),
      },
      {
        path: 'empresa/:organizationId/:paymentId',
        title: 'Pago de empresa · Pettly',
        loadComponent: () =>
          import('./pages/payment-detail.page').then(
            (m) => m.PaymentDetailPage,
          ),
      },
    ],
  },
];
