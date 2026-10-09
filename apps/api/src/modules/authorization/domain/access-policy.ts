import {
  ROLE_PERMISSIONS,
  type GlobalRole,
  type MembershipRole,
  type Permission,
} from '../../../shared/domain/authorization';
export function hasPermission(
  globalRole: GlobalRole,
  permission: Permission,
  membershipRole?: MembershipRole,
) {
  return (
    Boolean(ROLE_PERMISSIONS[globalRole]?.includes(permission)) ||
    (membershipRole
      ? Boolean(ROLE_PERMISSIONS[membershipRole]?.includes(permission))
      : false)
  );
}

export const OPERATIONAL_PERMISSIONS: readonly Permission[] = [
  'payments.business.read',
  'orders.settings.manage',
  'catalog.manage',
  'inventory.manage',
  'orders.fulfillment.manage',
  'services.manage',
  'bookings.manage',
  'adoptions.publications.manage',
  'animals.manage',
  'adoptions.requests.review',
];
export function organizationPermissionAvailable(
  permission: Permission,
  status: import('../../../shared/domain/organization-state').OrganizationStatus,
  type: import('../../../shared/domain/authorization').OrganizationType,
  administrative = false,
) {
  if (status === 'deleted') return false;
  if (OPERATIONAL_PERMISSIONS.includes(permission)) {
    if (status !== 'active') return false;
    return type === 'business'
      ? ![
          'animals.manage',
          'adoptions.publications.manage',
          'adoptions.requests.review',
        ].includes(permission)
      : [
          'animals.manage',
          'adoptions.publications.manage',
          'adoptions.requests.review',
        ].includes(permission);
  }
  if (
    !administrative &&
    permission === 'organizations.profile.update' &&
    ['pending', 'suspended'].includes(status)
  )
    return false;
  return true;
}
