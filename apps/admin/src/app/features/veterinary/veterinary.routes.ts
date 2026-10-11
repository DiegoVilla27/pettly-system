import { superAdminGuard, veterinaryQueueGuard } from '../../core/auth';
import type { Routes } from '@angular/router';
import { VETERINARY_GATEWAY } from './models/veterinary-gateway';
import { HttpVeterinaryGateway } from './services/http-veterinary.gateway';
export const VETERINARY_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: VETERINARY_GATEWAY, useClass: HttpVeterinaryGateway },
    ],
    children: [
      {
        path: 'mis-acreditaciones',
        title: 'Mis acreditaciones · Pettly',
        loadComponent: () =>
          import('./pages/my-credentials.page').then(
            (m) => m.MyCredentialsPage,
          ),
      },
      {
        path: 'nueva',
        title: 'Preparar acreditación · Pettly',
        loadComponent: () =>
          import('./pages/credential-prepare.page').then(
            (m) => m.CredentialPreparePage,
          ),
      },
      {
        path: ':credentialId/preparar',
        title: 'Preparar acreditación · Pettly',
        loadComponent: () =>
          import('./pages/credential-prepare.page').then(
            (m) => m.CredentialPreparePage,
          ),
      },

      {
        path: '',
        canMatch: [veterinaryQueueGuard],
        title: 'Acreditaciones veterinarias · Pettly',
        loadComponent: () =>
          import('./pages/veterinary-list.page').then(
            (m) => m.VeterinaryListPage,
          ),
      },
      {
        path: ':credentialId',
        title: 'Datos y evidencias · Pettly',
        loadComponent: () =>
          import('./pages/credential-detail.page').then(
            (m) => m.CredentialDetailPage,
          ),
      },
      {
        path: ':credentialId/revision',
        canMatch: [superAdminGuard],
        title: 'Revisión veterinaria · Pettly',
        loadComponent: () =>
          import('./pages/credential-review.page').then(
            (m) => m.CredentialReviewPage,
          ),
      },
      {
        path: ':credentialId/auditoria',
        title: 'Auditoría veterinaria · Pettly',
        loadComponent: () =>
          import('./pages/credential-audit.page').then(
            (m) => m.CredentialAuditPage,
          ),
      },
    ],
  },
];
