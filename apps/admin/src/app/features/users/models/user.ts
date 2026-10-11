import type { ApiRequest, ApiResponse, ApiQuery } from '@pettly/api-client';
export type UserDto = ApiResponse<'getUserAsAdministrator'>;
export type UserProfile = ApiRequest<'updateUserAsAdministrator'>['profile'];
export type GlobalRole = UserDto['globalRole'];
export type UserStatus = UserDto['status'];
export type MembershipRole = ApiRequest<'assignOrganizationRole'>['role'];
export interface User extends UserDto {
  readonly fullName: string;
  readonly initials: string;
  readonly roleLabel: string;
  readonly statusLabel: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export type UserFilters = Required<
  Pick<ApiQuery<'listUsers'>, 'page' | 'limit' | 'sortBy' | 'sortOrder'>
> &
  Pick<
    ApiQuery<'listUsers'>,
    'search' | 'status' | 'role' | 'organizationRole' | 'emailVerified'
  >;
export type UserAccess = ApiResponse<'getUserAccessAsAdministrator'>;
export type Membership = UserAccess['organizations'][number];
export type OrganizationOption =
  ApiResponse<'listOrganizations'>['items'][number];
export type AuditEntry =
  ApiResponse<'listUserAuditAsAdministrator'>['items'][number];
export type InviteUser = ApiRequest<'inviteUserAsAdministrator'>;
export type UserCommand =
  | {
      kind: 'delete';
      userId: string;
      body: ApiRequest<'deleteUserAsAdministrator'>;
    }
  | {
      kind: 'profile';
      userId: string;
      body: ApiRequest<'updateUserAsAdministrator'>;
    }
  | { kind: 'status'; userId: string; body: ApiRequest<'changeUserStatus'> }
  | { kind: 'role'; userId: string; body: ApiRequest<'changeUserGlobalRole'> }
  | {
      kind: 'resend';
      userId: string;
      body: ApiRequest<'resendInvitationAsAdministrator'>;
    }
  | {
      kind: 'membership';
      userId: string;
      organizationId: string;
      body: ApiRequest<'assignOrganizationRole'>;
    }
  | {
      kind: 'remove-membership';
      userId: string;
      organizationId: string;
      body: ApiRequest<'removeOrganizationRole'>;
    };
export const globalRoles: ReadonlyArray<{ value: GlobalRole; label: string }> =
  [
    { value: 'user', label: 'Usuario' },
    { value: 'moderator', label: 'Moderador' },
    { value: 'super_admin', label: 'Superadministrador' },
  ];
export const membershipRoles: ReadonlyArray<{
  value: MembershipRole;
  label: string;
}> = [
  { value: 'business_admin', label: 'Administrador de empresa' },
  { value: 'business_operator', label: 'Operador de empresa' },
  { value: 'adoption_admin', label: 'Administrador de refugio' },
  { value: 'adoption_operator', label: 'Operador de refugio' },
];
export const defaultFilters: UserFilters = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};
