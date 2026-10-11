import type { Routes } from '@angular/router';
import {
  moderationGuard,
  adoptionsManageGuard,
  adoptionRequestsGuard,
} from '../../core/auth';
import { REQUESTS_GATEWAY } from './models/requests-gateway';
import { HttpRequestsGateway } from './services/http-requests.gateway';
import { PUBLICATIONS_GATEWAY } from './models/publications-gateway';
import { HttpPublicationsGateway } from './services/http-publications.gateway';
export const ADOPTIONS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: PUBLICATIONS_GATEWAY, useClass: HttpPublicationsGateway },
      { provide: REQUESTS_GATEWAY, useClass: HttpRequestsGateway },
    ],
    children: [
      {
        path: 'revision',
        canMatch: [moderationGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            data: { review: true },
            title: 'Revisión de adopciones · Pettly',
            loadComponent: () =>
              import('./pages/publications-list.page').then(
                (m) => m.PublicationsListPage,
              ),
          },
          {
            path: ':publicationId',
            data: { review: true },
            title: 'Revisar adopción · Pettly',
            loadComponent: () =>
              import('./pages/publication-detail.page').then(
                (m) => m.PublicationDetailPage,
              ),
          },
        ],
      },
      {
        path: '',
        canMatch: [adoptionsManageGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Publicaciones de adopción · Pettly',
            loadComponent: () =>
              import('./pages/publications-list.page').then(
                (m) => m.PublicationsListPage,
              ),
          },
          {
            path: ':organizationId/nuevo',
            title: 'Preparar publicación · Pettly',
            loadComponent: () =>
              import('./pages/publication-create.page').then(
                (m) => m.PublicationCreatePage,
              ),
          },
          {
            path: ':organizationId/:publicationId/solicitudes',
            canMatch: [adoptionRequestsGuard],
            title: 'Solicitudes de adopción · Pettly',
            loadComponent: () =>
              import('./pages/requests-list.page').then(
                (m) => m.RequestsListPage,
              ),
          },
          {
            path: ':organizationId/:publicationId/solicitudes/:adoptionRequestId',
            canMatch: [adoptionRequestsGuard],
            title: 'Solicitud de adopción · Pettly',
            loadComponent: () =>
              import('./pages/request-detail.page').then(
                (m) => m.RequestDetailPage,
              ),
          },
          {
            path: ':organizationId/:publicationId',
            title: 'Publicación de adopción · Pettly',
            loadComponent: () =>
              import('./pages/publication-detail.page').then(
                (m) => m.PublicationDetailPage,
              ),
          },
        ],
      },
    ],
  },
];
