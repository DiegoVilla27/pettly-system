import { commercialGuard } from './core/auth/guards/session.guards';
import { organizationsGuard } from './core/auth/guards/session.guards';
import { veterinaryGuard } from './core/auth/guards/session.guards';
import type { Routes } from '@angular/router';
import {
  guestGuard,
  identityGuard,
  sessionGuard,
  superAdminGuard,
  moderationGuard,
  inventoryGuard,
  servicesGuard,
  bookingsGuard,
  ordersGuard,
  paymentsGuard,
  animalsGuard,
  adoptionsGuard,
  productsGuard,
} from './core/auth/guards/session.guards';
export const appRoutes: Routes = [
  {
    path: 'forgot-password',
    title: 'Acceso seguro · Pettly',
    data: { action: 'forgot' },
    loadComponent: () =>
      import('./features/auth/pages/access-action.page').then(
        (m) => m.AccessActionPage,
      ),
  },
  {
    path: 'reset-password',
    title: 'Acceso seguro · Pettly',
    data: { action: 'reset' },
    loadComponent: () =>
      import('./features/auth/pages/access-action.page').then(
        (m) => m.AccessActionPage,
      ),
  },
  {
    path: 'verify-email',
    title: 'Acceso seguro · Pettly',
    data: { action: 'verify' },
    loadComponent: () =>
      import('./features/auth/pages/access-action.page').then(
        (m) => m.AccessActionPage,
      ),
  },
  {
    path: 'resend-verification',
    title: 'Acceso seguro · Pettly',
    data: { action: 'resend' },
    loadComponent: () =>
      import('./features/auth/pages/access-action.page').then(
        (m) => m.AccessActionPage,
      ),
  },
  {
    path: 'accept-invitation',
    title: 'Acceso seguro · Pettly',
    data: { action: 'invitation' },
    loadComponent: () =>
      import('./features/auth/pages/access-action.page').then(
        (m) => m.AccessActionPage,
      ),
  },
  {
    path: 'confirm-email-change',
    title: 'Acceso seguro · Pettly',
    data: { action: 'confirm-email' },
    loadComponent: () =>
      import('./features/auth/pages/access-action.page').then(
        (m) => m.AccessActionPage,
      ),
  },

  {
    path: 'acceso',
    canMatch: [guestGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'sin-acceso',
    canMatch: [identityGuard],
    title: 'Acceso de equipo · Pettly',
    loadComponent: () =>
      import('./features/auth/pages/access-denied.page').then(
        (m) => m.AccessDeniedPage,
      ),
  },
  {
    path: '',
    canMatch: [sessionGuard],
    loadComponent: () =>
      import('./core/layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'notificaciones',
        loadChildren: () =>
          import('./features/notifications/notifications.routes').then(
            (m) => m.NOTIFICATIONS_ROUTES,
          ),
      },
      {
        path: 'adopciones',
        canMatch: [adoptionsGuard],
        loadChildren: () =>
          import('./features/adoptions/adoptions.routes').then(
            (m) => m.ADOPTIONS_ROUTES,
          ),
      },
      {
        path: 'animales',
        canMatch: [animalsGuard],
        loadChildren: () =>
          import('./features/animals/animals.routes').then(
            (m) => m.ANIMALS_ROUTES,
          ),
      },
      {
        path: 'pagos',
        canMatch: [paymentsGuard],
        loadChildren: () =>
          import('./features/payments/payments.routes').then(
            (m) => m.PAYMENTS_ROUTES,
          ),
      },
      {
        path: 'pedidos',
        canMatch: [ordersGuard],
        loadChildren: () =>
          import('./features/orders/orders.routes').then(
            (m) => m.ORDERS_ROUTES,
          ),
      },
      {
        path: 'reservas',
        canMatch: [bookingsGuard],
        loadChildren: () =>
          import('./features/bookings/bookings.routes').then(
            (m) => m.BOOKINGS_ROUTES,
          ),
      },
      {
        path: 'servicios',
        canMatch: [servicesGuard],
        loadChildren: () =>
          import('./features/services/services.routes').then(
            (m) => m.SERVICES_ROUTES,
          ),
      },
      {
        path: 'inventario',
        canMatch: [inventoryGuard],
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then(
            (m) => m.INVENTORY_ROUTES,
          ),
      },
      {
        path: 'productos',
        canMatch: [productsGuard],
        loadChildren: () =>
          import('./features/products/products.routes').then(
            (m) => m.PRODUCTS_ROUTES,
          ),
      },
      {
        path: 'catalogo',
        canMatch: [moderationGuard],
        loadChildren: () =>
          import('./features/catalog/catalog.routes').then(
            (m) => m.CATALOG_ROUTES,
          ),
      },
      {
        path: 'veterinaria',
        canMatch: [veterinaryGuard],
        loadChildren: () =>
          import('./features/veterinary/veterinary.routes').then(
            (m) => m.VETERINARY_ROUTES,
          ),
      },
      {
        path: 'organizaciones',
        canMatch: [organizationsGuard],
        loadChildren: () =>
          import('./features/organizations/organizations.routes').then(
            (m) => m.ORGANIZATIONS_ROUTES,
          ),
      },
      {
        path: 'usuarios',
        canMatch: [superAdminGuard],
        loadChildren: () =>
          import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'condiciones-comerciales',
        canMatch: [commercialGuard],
        loadChildren: () =>
          import('./features/commercial/commercial.routes').then(
            (m) => m.COMMERCIAL_ROUTES,
          ),
      },
      {
        path: 'inicio',
        title: 'Mi espacio · Pettly',
        loadComponent: () =>
          import('./features/workspace/pages/home.page').then(
            (m) => m.HomePage,
          ),
      },
      {
        path: 'cuenta',
        title: 'Mi cuenta · Pettly',
        loadComponent: () =>
          import('./features/account/pages/account.page').then(
            (m) => m.AccountPage,
          ),
      },
    ],
  },
  {
    path: '**',
    title: 'Página no encontrada · Pettly',
    loadComponent: () =>
      import('./core/layout/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];
