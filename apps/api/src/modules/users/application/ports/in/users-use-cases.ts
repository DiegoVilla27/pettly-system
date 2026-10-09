import type { ChangeUserStatusCommand } from '../../commands/change-user-status.command';
import type { ChangeUserRoleCommand } from '../../commands/change-user-role.command';
import type { BootstrapSuperAdminCommand } from '../../commands/bootstrap-super-admin.command';
import type { UserProfile } from '../../results/user-profile';
import type { UpdateProfileCommand } from '../../commands/update-profile.command';
import type { GetProfileQuery } from '../../queries/get-profile.query';
export interface UsersUseCases {
  listAudit(
    query: import('../../queries/list-user-audit.query').ListUserAuditQuery,
  ): Promise<import('../../results/user-audit-page').UserAuditPage>;
  list(
    query: import('../../queries/list-users.query').ListUsersQuery,
  ): Promise<import('../../results/user-page').UserPage>;
  getUser(
    query: import('../../queries/get-user.query').GetUserQuery,
  ): Promise<UserProfile>;
  adminUpdateProfile(
    command: import('../../commands/admin-update-profile.command').AdminUpdateProfileCommand,
  ): Promise<UserProfile>;
  changeRole(command: ChangeUserRoleCommand): Promise<UserProfile>;
  changeStatus(command: ChangeUserStatusCommand): Promise<UserProfile>;
  bootstrapSuperAdmin(
    command: BootstrapSuperAdminCommand,
  ): Promise<UserProfile>;
  getProfile(query: GetProfileQuery): Promise<UserProfile>;
  updateProfile(command: UpdateProfileCommand): Promise<UserProfile>;
}
export const USERS_USE_CASES = Symbol('USERS_USE_CASES');
