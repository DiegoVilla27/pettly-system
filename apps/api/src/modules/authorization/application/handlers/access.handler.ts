import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  GLOBAL_ROLES,
  MEMBERSHIP_ROLES,
  ROLE_PERMISSIONS,
  requireSuperAdmin,
  type Permission,
} from '../../../../shared/domain/authorization';
import type { UsersDirectory } from '../../../users/application/ports/out/users-directory';
import type { OrganizationAccess } from '../../../organizations/application/ports/in/organization-access';
import type { Authorization } from '../ports/in/authorization';
import type {
  GetAccessQuery,
  GetUserAccessQuery,
} from '../queries/get-access.query';
import type { RoleDefinition } from '../results/access';
import type { UserProfile } from '../../../users/application/results/user-profile';
import {
  hasPermission,
  organizationPermissionAvailable,
  OPERATIONAL_PERMISSIONS,
} from '../../domain/access-policy';
export class AccessHandler implements Authorization {
  constructor(
    private readonly users: UsersDirectory,
    private readonly organizations: OrganizationAccess,
  ) {}
  roles(): readonly RoleDefinition[] {
    return [
      ...GLOBAL_ROLES.map((role) => ({
        role,
        scope: 'platform' as const,
        organizationType: null,
        permissions: ROLE_PERMISSIONS[role],
      })),
      ...MEMBERSHIP_ROLES.map((role) => ({
        role,
        scope: 'organization' as const,
        organizationType: role.startsWith('business_')
          ? ('business' as const)
          : ('adoption_entity' as const),
        permissions: ROLE_PERMISSIONS[role],
      })),
    ];
  }
  async getUserAccess(query: GetUserAccessQuery) {
    requireSuperAdmin(await this.users.findById(query.actorId));
    const user = await this.users.findById(query.userId);
    if (!user)
      throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
    return this.snapshot(user);
  }
  private async snapshot(user: UserProfile) {
    const memberships = await this.organizations.membershipsForUser(user.id);
    return {
      userId: user.id,
      globalRole: user.globalRole,
      globalPermissions: ROLE_PERMISSIONS[user.globalRole],
      organizations: memberships.map((m) => ({
        organizationId: m.organizationId,
        name: m.organization.name,
        type: m.organization.type,
        status: m.organization.status,
        role: m.role,
        permissions: [
          ...new Set([
            ...ROLE_PERMISSIONS[user.globalRole],
            ...ROLE_PERMISSIONS[m.role],
          ]),
        ].filter((permission) =>
          organizationPermissionAvailable(
            permission,
            m.organization.status,
            m.organization.type,
            user.globalRole === 'super_admin',
          ),
        ),
      })),
    };
  }
  async getAccess(query: GetAccessQuery) {
    const user = await this.users.findById(query.userId);
    if (!user || user.status !== 'active' || !user.emailVerifiedAt)
      throw new ApplicationError(
        'FORBIDDEN',
        'An active verified account is required.',
      );
    return this.snapshot(user);
  }

  async requirePermission(
    userId: string,
    permission: Permission,
    organizationId?: string,
  ) {
    const access = await this.getAccess({ userId });
    const membership = organizationId
      ? access.organizations.find((o) => o.organizationId === organizationId)
      : undefined;
    if (!hasPermission(access.globalRole, permission, membership?.role))
      throw new ApplicationError(
        'FORBIDDEN',
        'The required permission is unavailable in this context.',
      );
    if (OPERATIONAL_PERMISSIONS.includes(permission) && !organizationId)
      throw new ApplicationError(
        'FORBIDDEN',
        'An active organization context is required.',
      );
    if (organizationId) {
      const organization =
        membership ??
        (access.globalRole === 'super_admin' ||
        access.globalRole === 'moderator'
          ? await this.organizations.findOrganization(organizationId)
          : null);
      if (
        !organization ||
        !organizationPermissionAvailable(
          permission,
          organization.status,
          organization.type,
          access.globalRole === 'super_admin',
        )
      )
        throw new ApplicationError(
          'FORBIDDEN',
          'The organization state does not allow this operation.',
        );
    }
  }
}
