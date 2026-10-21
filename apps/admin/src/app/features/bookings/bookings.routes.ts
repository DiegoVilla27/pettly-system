import type { Routes } from '@angular/router';
import { BOOKINGS_GATEWAY } from './models/bookings-gateway';
import { HttpBookingsGateway } from './services/http-bookings.gateway';
export const BOOKINGS_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: BOOKINGS_GATEWAY, useClass: HttpBookingsGateway }],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Reservas · Pettly',
        loadComponent: () =>
          import('./pages/bookings-list.page').then((m) => m.BookingsListPage),
      },
      {
        path: ':organizationId/:bookingId',
        title: 'Gestionar reserva · Pettly',
        loadComponent: () =>
          import('./pages/booking-detail.page').then(
            (m) => m.BookingDetailPage,
          ),
      },
    ],
  },
];
