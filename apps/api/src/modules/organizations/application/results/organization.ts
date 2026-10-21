import type { MembershipRole } from '../../../../shared/domain/authorization';
export type OrganizationResult =
  import('../../domain/aggregates/organization').OrganizationState;
export type OrganizationProfileChanges =
  import('../../domain/value-objects/organization-profile').OrganizationProfileChanges;
export interface OrganizationPage {
  items: OrganizationResult[];
  total: number;
  page: number;
  limit: number;
}
export interface MembershipResult {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
  createdAt: Date;
  updatedAt: Date;
}
export interface OrganizationMembership extends MembershipResult {
  organization: OrganizationResult;
}
