import type {
  OrganizationResult,
  MembershipResult,
  OrganizationMembership,
} from '../../results/organization';
import type { MembershipRole } from '../../../../../shared/domain/authorization';
export interface OrganizationAudit {
  id: string;
  actorId: string;
  organizationId: string;
  targetUserId: string | null;
  action:
    | 'organization.created'
    | 'organization.requested'
    | 'organization.profile_updated'
    | 'organization.submitted'
    | 'organization.approved'
    | 'organization.rejected'
    | 'organization.status_changed'
    | 'organization.responsible_changed'
    | 'organization.deleted'
    | 'membership.role_assigned'
    | 'membership.role_removed';
  previousValue: string | null;
  nextValue: string | null;
  reason: string;
  requestId: string;
  createdAt: Date;
}
export interface OrganizationsWork {
  lock(key: string): Promise<void>;
  find(id: string): Promise<OrganizationResult | null>;
  save(organization: OrganizationResult): Promise<OrganizationResult>;
  list(
    query: import('../../queries/organization-management.queries').ListOrganizationsQuery,
  ): Promise<import('../../results/organization').OrganizationPage>;
  members(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: MembershipResult[];
    total: number;
    page: number;
    limit: number;
  }>;
  audits(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: OrganizationAudit[];
    total: number;
    page: number;
    limit: number;
  }>;
  create(organization: OrganizationResult): Promise<OrganizationResult>;
  membership(
    organizationId: string,
    userId: string,
  ): Promise<MembershipResult | null>;
  assign(
    id: string,
    organizationId: string,
    userId: string,
    role: MembershipRole,
    now: Date,
  ): Promise<MembershipResult>;
  remove(id: string): Promise<void>;
  audit(entry: OrganizationAudit): Promise<void>;
}
export interface OrganizationsRepository {
  run<T>(work: (context: OrganizationsWork) => Promise<T>): Promise<T>;
  membershipsForUser(userId: string): Promise<OrganizationMembership[]>;
}
export const ORGANIZATIONS_REPOSITORY = Symbol('ORGANIZATIONS_REPOSITORY');
