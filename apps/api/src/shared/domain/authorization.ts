import { ApplicationError } from './application-error';

export const GLOBAL_ROLES = ['user', 'moderator', 'super_admin'] as const;
export const MEMBERSHIP_ROLES = [
  'business_admin',
  'business_operator',
  'adoption_admin',
  'adoption_operator',
] as const;
export const ORGANIZATION_TYPES = ['business', 'adoption_entity'] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];
export const PERMISSIONS = [
  'payments.self.manage',
  'payments.business.read',
  'payments.platform.manage',
  'cart.self.manage',
  'orders.settings.manage',
  'profile.self.manage',
  'orders.self.manage',
  'bookings.self.manage',
  'adoptions.self.manage',
  'users.status.update',
  'users.roles.manage',
  'organizations.create',
  'organizations.requests.manage',
  'organizations.profile.read',
  'organizations.review',
  'organizations.status.update',
  'organizations.delete',
  'organizations.members.read',
  'organizations.audit.read',
  'organizations.members.roles.manage',
  'platform.settings.manage',
  'moderation.publications.review',
  'reports.manage',
  'organizations.read',
  'organizations.profile.update',
  'catalog.manage',
  'inventory.manage',
  'orders.fulfillment.manage',
  'services.manage',
  'bookings.manage',
  'animals.self.manage',
  'adoptions.publications.manage',
  'animals.manage',
  'adoptions.requests.review',
] as const;
export type Permission = (typeof PERMISSIONS)[number];
const customer: Permission[] = [
  'payments.self.manage',
  'cart.self.manage',
  'animals.self.manage',
  'organizations.requests.manage',
  'profile.self.manage',
  'orders.self.manage',
  'bookings.self.manage',
  'adoptions.self.manage',
];
const company: Permission[] = [
  'organizations.read',
  'catalog.manage',
  'inventory.manage',
  'orders.fulfillment.manage',
  'services.manage',
  'bookings.manage',
];
const adoption: Permission[] = [
  'adoptions.publications.manage',
  'organizations.read',
  'animals.manage',
  'adoptions.requests.review',
];
export const ROLE_PERMISSIONS: Record<
  GlobalRole | MembershipRole,
  readonly Permission[]
> = {
  user: customer,
  moderator: [
    ...customer,
    'organizations.read',
    'moderation.publications.review',
    'reports.manage',
  ],
  super_admin: PERMISSIONS,
  business_admin: [
    'payments.business.read',
    'orders.settings.manage',
    ...company,
    'organizations.profile.update',
    'organizations.profile.read',
    'organizations.members.read',
  ],
  business_operator: company,
  adoption_admin: [
    ...adoption,
    'organizations.profile.update',
    'organizations.profile.read',
    'organizations.members.read',
  ],
  adoption_operator: adoption,
};
export function validateMembershipRole(
  role: MembershipRole,
  type: OrganizationType,
) {
  if (
    !MEMBERSHIP_ROLES.includes(role) ||
    !ORGANIZATION_TYPES.includes(type) ||
    (type === 'business'
      ? !role.startsWith('business_')
      : !role.startsWith('adoption_'))
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'The membership role must match the organization type.',
    );
}
export function administrativeReason(value: string): string {
  if (typeof value !== 'string')
    throw new ApplicationError(
      'INVALID_INPUT',
      'An administrative reason is required.',
    );
  const reason = value.trim();
  if (reason.length < 10 || reason.length > 500 || /\p{Cc}/u.test(reason))
    throw new ApplicationError(
      'INVALID_INPUT',
      'Provide a reason of 10 to 500 characters without control characters.',
    );
  return reason;
}
export function requireSuperAdmin(
  actor: {
    status: string;
    globalRole: string;
    emailVerifiedAt: Date | null;
  } | null,
) {
  if (
    !actor ||
    actor.status !== 'active' ||
    !actor.emailVerifiedAt ||
    actor.globalRole !== 'super_admin'
  )
    throw new ApplicationError(
      'FORBIDDEN',
      'Super administrator access is required.',
    );
}
