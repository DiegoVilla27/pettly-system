import { RESOURCE_GATEWAY } from './models/resource-gateway';
import { HttpResourceGateway } from './services/http-resource.gateway';
import type { Routes } from '@angular/router';
import { SERVICES_GATEWAY } from './models/services-gateway';
import { HttpServicesGateway } from './services/http-services.gateway';
import { moderationGuard, servicesManageGuard } from '../../core/auth';
export const SERVICES_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: SERVICES_GATEWAY, useClass: HttpServicesGateway },
      { provide: RESOURCE_GATEWAY, useClass: HttpResourceGateway },
    ],
    children: [
      {
        path: 'revision',
        canMatch: [moderationGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Revisión de servicios · Pettly',
            data: { review: true },
            loadComponent: () =>
              import('./pages/services-list.page').then(
                (m) => m.ServicesListPage,
              ),
          },
          {
            path: ':serviceId',
            title: 'Revisar servicio · Pettly',
            data: { review: true },
            loadComponent: () =>
              import('./pages/service-detail.page').then(
                (m) => m.ServiceDetailPage,
              ),
          },
        ],
      },
      {
        path: '',
        canMatch: [servicesManageGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Servicios · Pettly',
            loadComponent: () =>
              import('./pages/services-list.page').then(
                (m) => m.ServicesListPage,
              ),
          },
          {
            path: 'recursos',
            title: 'Recursos · Pettly',
            loadComponent: () =>
              import('./pages/resources-list.page').then(
                (m) => m.ResourcesListPage,
              ),
          },
          {
            path: ':organizationId/recursos/nuevo',
            title: 'Crear recurso · Pettly',
            loadComponent: () =>
              import('./pages/resource-detail.page').then(
                (m) => m.ResourceDetailPage,
              ),
          },
          {
            path: ':organizationId/recursos/:resourceId',
            title: 'Agenda · Pettly',
            loadComponent: () =>
              import('./pages/resource-detail.page').then(
                (m) => m.ResourceDetailPage,
              ),
          },
          {
            path: ':organizationId/nuevo',
            title: 'Crear servicio · Pettly',
            loadComponent: () =>
              import('./pages/service-create.page').then(
                (m) => m.ServiceCreatePage,
              ),
          },
          {
            path: ':organizationId/:serviceId',
            title: 'Gestionar servicio · Pettly',
            loadComponent: () =>
              import('./pages/service-detail.page').then(
                (m) => m.ServiceDetailPage,
              ),
          },
        ],
      },
    ],
  },
];
