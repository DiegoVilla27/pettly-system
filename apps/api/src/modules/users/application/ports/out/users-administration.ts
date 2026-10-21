import type { UserProfile } from '../../results/user-profile';
import type { UserStatus, GlobalRole } from '../../../domain/aggregates/user';
export interface UserAuditEntry {
  id: string;
  actorId: string | null;
  targetId: string;
  action:
    | 'user.status_changed'
    | 'user.global_role_granted'
    | 'user.global_role_changed'
    | 'user.invitation_resent'
    | 'user.created'
    | 'user.profile_updated'
    | 'user.email_changed'
    | 'user.deleted';
  previousValue: string;
  nextValue: string;
  reason: string;
  requestId: string | null;
  createdAt: Date;
}
export interface UsersAdministrationWork {
  lock(key: string): Promise<void>;
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  countSuperAdmins(activeOnly: boolean): Promise<number>;
  updateProfile(
    id: string,
    changes: import('../../results/user-profile').ProfileChanges,
    now: Date,
  ): Promise<UserProfile>;
  listAudit(
    query: import('../../queries/list-user-audit.query').ListUserAuditQuery,
  ): Promise<import('../../results/user-audit-page').UserAuditPage>;
  list(
    query: import('../../queries/list-users.query').ListUsersQuery,
  ): Promise<import('../../results/user-page').UserPage>;
  setStatus(id: string, status: UserStatus, now: Date): Promise<UserProfile>;
  grantSuperAdmin(id: string, now: Date): Promise<UserProfile>;
  setGlobalRole(id: string, role: GlobalRole, now: Date): Promise<UserProfile>;
  revokeSessions(userId: string, now: Date): Promise<void>;
  audit(entry: UserAuditEntry): Promise<void>;
}
export interface UsersAdministration {
  run<T>(work: (context: UsersAdministrationWork) => Promise<T>): Promise<T>;
}
export const USERS_ADMINISTRATION = Symbol('USERS_ADMINISTRATION');
