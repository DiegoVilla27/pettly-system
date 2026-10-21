import { superAdminGuard, organizationsQueueGuard } from '../../core/auth';
import type { Routes } from '@angular/router';
import { ORGANIZATIONS_GATEWAY } from './models/organizations-gateway';
import { HttpOrganizationsGateway } from './services/http-organizations.gateway';
export const ORGANIZATIONS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: ORGANIZATIONS_GATEWAY, useClass: HttpOrganizationsGateway },
    ],
    children: [
      {
        path: 'mis-equipos',
        title: 'Mis organizaciones · Pettly',
        loadComponent: () =>
          import('./pages/my-organizations.page').then(
            (m) => m.MyOrganizationsPage,
          ),
      },
      {
        path: 'mis-equipos/:organizationId',
        title: 'Mi organización · Pettly',
        loadComponent: () =>
          import('./pages/my-organization-detail.page').then(
            (m) => m.MyOrganizationDetailPage,
          ),
      },

      {
        path: '',
        canMatch: [organizationsQueueGuard],
        title: 'Organizaciones · Pettly',
        loadComponent: () =>
          import('./pages/organizations-list.page').then(
            (m) => m.OrganizationsListPage,
          ),
      },
      {
        path: 'crear',
        canMatch: [superAdminGuard],
        title: 'Crear organización · Pettly',
        loadComponent: () =>
          import('./pages/organization-create.page').then(
            (m) => m.OrganizationCreatePage,
          ),
      },
      {
        path: ':organizationId',
        canMatch: [superAdminGuard],
        title: 'Detalle de organización · Pettly',
        loadComponent: () =>
          import('./pages/organization-detail.page').then(
            (m) => m.OrganizationDetailPage,
          ),
      },
      {
        path: ':organizationId/editar',
        canMatch: [superAdminGuard],
        title: 'Editar organización · Pettly',
        loadComponent: () =>
          import('./pages/organization-edit.page').then(
            (m) => m.OrganizationEditPage,
          ),
      },
      {
        path: ':organizationId/revision',
        canMatch: [superAdminGuard],
        title: 'Revisión de organización · Pettly',
        loadComponent: () =>
          import('./pages/organization-review.page').then(
            (m) => m.OrganizationReviewPage,
          ),
      },
      {
        path: ':organizationId/miembros',
        canMatch: [superAdminGuard],
        title: 'Miembros de organización · Pettly',
        loadComponent: () =>
          import('./pages/organization-members.page').then(
            (m) => m.OrganizationMembersPage,
          ),
      },
      {
        path: ':organizationId/auditoria',
        canMatch: [superAdminGuard],
        title: 'Auditoría de organización · Pettly',
        loadComponent: () =>
          import('./pages/organization-audit.page').then(
            (m) => m.OrganizationAuditPage,
          ),
      },
    ],
  },
];
