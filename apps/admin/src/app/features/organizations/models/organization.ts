import type { ApiRequest, ApiResponse, ApiQuery } from '@pettly/api-client';
export type OrganizationDto = ApiResponse<'getOrganization'>;
export type OrganizationProfileDto = ApiResponse<'getOrganizationProfile'>;
export type OrganizationStatus = OrganizationDto['status'];
export type OrganizationType = OrganizationDto['type'];
export type ProfileChanges = ApiRequest<'updateOrganizationProfile'>['profile'];
export type CreateOrganization = ApiRequest<'createOrganization'>;
export interface Organization extends OrganizationDto {
  readonly statusLabel: string;
  readonly typeLabel: string;
}
export interface OrganizationProfile extends OrganizationProfileDto {
  readonly statusLabel: string;
  readonly typeLabel: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export type Member = ApiResponse<'listOrganizationMembers'>['items'][number];
export type AuditEntry = ApiResponse<'listOrganizationAudit'>['items'][number];
export interface AccountOption {
  id: string;
  fullName: string;
  email: string;
}
export type OrganizationFilters = Required<
  Pick<ApiQuery<'listOrganizations'>, 'page' | 'limit'>
> &
  Pick<
    ApiQuery<'listOrganizations'>,
    'search' | 'type' | 'status' | 'countryCode'
  >;
export const defaultFilters: OrganizationFilters = { page: 1, limit: 20 };
export const statuses: ReadonlyArray<{
  value: OrganizationStatus;
  label: string;
}> = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'En revisión' },
  { value: 'active', label: 'Activa' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'suspended', label: 'Suspendida' },
  { value: 'deleted', label: 'Archivada' },
];
export const types: ReadonlyArray<{ value: OrganizationType; label: string }> =
  [
    { value: 'business', label: 'Empresa' },
    { value: 'adoption_entity', label: 'Refugio' },
  ];
export const requiredProfileFields = [
  'legalName',
  'registrationNumber',
  'email',
  'phone',
  'countryCode',
  'city',
  'address',
] as const;
export const requiredFieldLabels: Record<
  (typeof requiredProfileFields)[number],
  string
> = {
  legalName: 'Razón social',
  registrationNumber: 'Número de registro',
  email: 'Correo de contacto',
  phone: 'Teléfono',
  countryCode: 'País',
  city: 'Ciudad',
  address: 'Dirección',
};
export type OrganizationCommand =
  | {
      kind: 'archive';
      organizationId: string;
      body: ApiRequest<'archiveOrganization'>;
    }
  | {
      kind: 'profile';
      organizationId: string;
      body: ApiRequest<'updateOrganizationProfile'>;
    }
  | {
      kind: 'submit' | 'reject';
      organizationId: string;
      body: ApiRequest<'submitOrganization'>;
    }
  | {
      kind: 'approve' | 'responsible';
      organizationId: string;
      body: ApiRequest<'approveOrganization'>;
    }
  | {
      kind: 'status';
      organizationId: string;
      body: ApiRequest<'updateOrganizationStatus'>;
    };
