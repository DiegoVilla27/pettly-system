import type { Routes } from '@angular/router';
import { USERS_GATEWAY } from './models/users-gateway';
import { HttpUsersGateway } from './services/http-users.gateway';
export const USERS_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: USERS_GATEWAY, useClass: HttpUsersGateway }],
    children: [
      {
        path: '',
        title: 'Usuarios · Pettly',
        loadComponent: () =>
          import('./pages/users-list.page').then((m) => m.UsersListPage),
      },
      {
        path: 'invitar',
        title: 'Invitar usuario · Pettly',
        loadComponent: () =>
          import('./pages/user-invite.page').then((m) => m.UserInvitePage),
      },
      {
        path: ':userId',
        title: 'Detalle de usuario · Pettly',
        loadComponent: () =>
          import('./pages/user-detail.page').then((m) => m.UserDetailPage),
      },
      {
        path: ':userId/editar',
        title: 'Editar usuario · Pettly',
        loadComponent: () =>
          import('./pages/user-edit.page').then((m) => m.UserEditPage),
      },
      {
        path: ':userId/acceso',
        title: 'Acceso de usuario · Pettly',
        loadComponent: () =>
          import('./pages/user-access.page').then((m) => m.UserAccessPage),
      },
      {
        path: ':userId/auditoria',
        title: 'Auditoría de usuario · Pettly',
        loadComponent: () =>
          import('./pages/user-audit.page').then((m) => m.UserAuditPage),
      },
    ],
  },
];
