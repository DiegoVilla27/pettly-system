import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { AUTH_SESSION } from '../models/session';
export const sessionGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const identity = session.identity();
  return !identity
    ? router.parseUrl('/acceso')
    : identity.backofficeAllowed
      ? true
      : router.parseUrl('/sin-acceso');
};
export const guestGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const identity = session.identity();
  return !identity
    ? true
    : router.parseUrl(identity.backofficeAllowed ? '/inicio' : '/sin-acceso');
};
export const identityGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  return session.identity() ? true : router.parseUrl('/acceso');
};

export const superAdminGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  return session.identity()?.role === 'super_admin'
    ? true
    : router.parseUrl('/inicio');
};

export const moderationGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  return session.hasPermission('moderation.publications.review')
    ? true
    : router.parseUrl('/inicio');
};

export const inventoryGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const identity = session.identity();
  return identity?.role === 'super_admin' ||
    identity?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'business' &&
        o.permissions.includes('inventory.manage'),
    )
    ? true
    : router.parseUrl('/inicio');
};

export const servicesManageGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'business' &&
        o.permissions.includes('services.manage'),
    )
    ? true
    : router.parseUrl(
        session.hasPermission('moderation.publications.review')
          ? '/servicios/revision'
          : '/inicio',
      );
};
export const servicesGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return session.hasPermission('moderation.publications.review') ||
    u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'business' &&
        o.permissions.includes('services.manage'),
    )
    ? true
    : router.parseUrl('/inicio');
};

export const bookingsGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'business' &&
        o.permissions.includes('bookings.manage'),
    )
    ? true
    : router.parseUrl('/inicio');
};

export const ordersGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'business' &&
        o.permissions.includes('orders.fulfillment.manage'),
    )
    ? true
    : router.parseUrl('/inicio');
};

export const paymentsGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'business' &&
        o.permissions.includes('payments.business.read'),
    )
    ? true
    : router.parseUrl('/inicio');
};

export const animalsGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'adoption_entity' &&
        o.permissions.includes('animals.manage'),
    )
    ? true
    : router.parseUrl('/inicio');
};

export const adoptionsGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return session.hasPermission('moderation.publications.review') ||
    u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'adoption_entity' &&
        o.permissions.includes('adoptions.publications.manage'),
    )
    ? true
    : router.parseUrl('/inicio');
};
export const adoptionsManageGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'adoption_entity' &&
        o.permissions.includes('adoptions.publications.manage'),
    )
    ? true
    : router.parseUrl(
        session.hasPermission('moderation.publications.review')
          ? '/adopciones/revision'
          : '/inicio',
      );
};

export const adoptionRequestsGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'adoption_entity' &&
        o.permissions.includes('adoptions.requests.review'),
    )
    ? true
    : router.parseUrl('/inicio');
};

export const productsGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.status === 'active' &&
        o.type === 'business' &&
        o.permissions.includes('catalog.manage'),
    )
    ? true
    : router.parseUrl('/inicio');
};

export const veterinaryGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  const u = session.identity();
  return u?.role === 'super_admin' ||
    u?.organizations.some(
      (o) =>
        o.type === 'business' &&
        o.status === 'active' &&
        o.permissions.includes('services.manage'),
    )
    ? true
    : router.parseUrl('/inicio');
};
export const veterinaryQueueGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  return session.identity()?.role === 'super_admin'
    ? true
    : router.parseUrl('/veterinaria/mis-acreditaciones');
};

export const organizationsGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  return session.identity()?.role === 'super_admin' ||
    session.identity()?.organizations.length
    ? true
    : router.parseUrl('/inicio');
};
export const organizationsQueueGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  return session.identity()?.role === 'super_admin'
    ? true
    : router.parseUrl('/organizaciones/mis-equipos');
};

export const commercialGuard: CanMatchFn = async () => {
  const session = inject(AUTH_SESSION),
    router = inject(Router);
  await session.ensureReady();
  return session.identity()?.role === 'super_admin' ||
    session
      .identity()
      ?.organizations.some(
        (o) =>
          o.type === 'business' &&
          o.status === 'active' &&
          o.permissions.includes('orders.settings.manage'),
      )
    ? true
    : router.parseUrl('/inicio');
};
