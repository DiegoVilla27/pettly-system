import type {
  GlobalRole,
  MembershipRole,
  OrganizationType,
  Permission,
} from '../../../../shared/domain/authorization';
export interface AccessResult {
  userId: string;
  globalRole: GlobalRole;
  globalPermissions: readonly Permission[];
  organizations: {
    organizationId: string;
    name: string;
    type: OrganizationType;
    role: MembershipRole;
    status: import('../../../../shared/domain/organization-state').OrganizationStatus;
    permissions: readonly Permission[];
  }[];
}
export interface RoleDefinition {
  role: GlobalRole | MembershipRole;
  scope: 'platform' | 'organization';
  organizationType: OrganizationType | null;
  permissions: readonly Permission[];
}
