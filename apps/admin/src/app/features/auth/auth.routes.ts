import type { Routes } from '@angular/router';
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    title: 'Entrar · Pettly',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
  },
];
