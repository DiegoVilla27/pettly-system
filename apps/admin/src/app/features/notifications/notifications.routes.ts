import type { Routes } from '@angular/router';
import { superAdminGuard } from '../../core/auth';
import { NOTIFICATIONS_GATEWAY } from './models/notifications-gateway';
import { HttpNotificationsGateway } from './services/http-notifications.gateway';
export const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: NOTIFICATIONS_GATEWAY, useClass: HttpNotificationsGateway },
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Notificaciones · Pettly',
        loadComponent: () =>
          import('./pages/inbox.page').then((m) => m.InboxPage),
      },
      {
        path: 'preferencias',
        title: 'Preferencias · Pettly',
        loadComponent: () =>
          import('./pages/preferences.page').then((m) => m.PreferencesPage),
      },
      {
        path: 'entregas',
        canMatch: [superAdminGuard],
        title: 'Entregas fallidas · Pettly',
        loadComponent: () =>
          import('./pages/deliveries.page').then((m) => m.DeliveriesPage),
      },
    ],
  },
];
