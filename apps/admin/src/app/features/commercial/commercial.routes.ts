import type { Routes } from '@angular/router';
import { COMMERCIAL_GATEWAY } from './models/commercial';
import { HttpCommercialGateway } from './services/http-commercial.gateway';
export const COMMERCIAL_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: COMMERCIAL_GATEWAY, useClass: HttpCommercialGateway },
    ],
    title: 'Condiciones comerciales · Pettly',
    loadComponent: () =>
      import('./pages/commercial.page').then((m) => m.CommercialPage),
  },
];
