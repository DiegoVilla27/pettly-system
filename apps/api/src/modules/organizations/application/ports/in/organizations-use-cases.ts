import type {
  CreateOrganizationCommand,
  AssignMembershipRoleCommand,
  RemoveMembershipRoleCommand,
} from '../../commands/organization.commands';
import type { GetOrganizationQuery } from '../../queries/get-organization.query';
import type {
  OrganizationResult,
  MembershipResult,
} from '../../results/organization';
export interface OrganizationsUseCases {
  request(
    command: import('../../commands/organization-lifecycle.commands').RequestOrganizationCommand,
  ): Promise<OrganizationResult>;
  list(
    query: import('../../queries/organization-management.queries').ListOrganizationsQuery,
  ): Promise<import('../../results/organization').OrganizationPage>;
  profile(query: GetOrganizationQuery): Promise<OrganizationResult>;
  updateProfile(
    command: import('../../commands/organization-lifecycle.commands').UpdateOrganizationProfileCommand,
  ): Promise<OrganizationResult>;
  submit(
    command: import('../../commands/organization-lifecycle.commands').OrganizationDecisionCommand,
  ): Promise<OrganizationResult>;
  approve(
    command: import('../../commands/organization-lifecycle.commands').OrganizationDecisionCommand,
  ): Promise<OrganizationResult>;
  reject(
    command: import('../../commands/organization-lifecycle.commands').OrganizationDecisionCommand,
  ): Promise<OrganizationResult>;
  status(
    command: import('../../commands/organization-lifecycle.commands').OrganizationStatusCommand,
  ): Promise<OrganizationResult>;
  responsible(
    command: import('../../commands/organization-lifecycle.commands').OrganizationDecisionCommand,
  ): Promise<OrganizationResult>;
  archive(
    command: import('../../commands/organization-lifecycle.commands').OrganizationDecisionCommand,
  ): Promise<void>;
  members(
    query: import('../../queries/organization-management.queries').OrganizationPageQuery,
  ): Promise<{
    items: MembershipResult[];
    total: number;
    page: number;
    limit: number;
  }>;
  audits(
    query: import('../../queries/organization-management.queries').OrganizationPageQuery,
  ): Promise<{
    items: import('../out/organizations-repository').OrganizationAudit[];
    total: number;
    page: number;
    limit: number;
  }>;

  create(command: CreateOrganizationCommand): Promise<OrganizationResult>;
  get(query: GetOrganizationQuery): Promise<OrganizationResult>;
  assign(command: AssignMembershipRoleCommand): Promise<MembershipResult>;
  remove(command: RemoveMembershipRoleCommand): Promise<void>;
}
export const ORGANIZATIONS_USE_CASES = Symbol('ORGANIZATIONS_USE_CASES');
