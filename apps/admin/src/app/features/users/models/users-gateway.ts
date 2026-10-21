import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  User,
  UserFilters,
  Page,
  InviteUser,
  UserCommand,
  UserAccess,
  AuditEntry,
  OrganizationOption,
} from './user';
export interface UsersGateway {
  list(filters: UserFilters): Observable<Page<User>>;
  get(userId: string): Observable<User>;
  access(userId: string): Observable<UserAccess>;
  audit(userId: string, page: number): Observable<Page<AuditEntry>>;
  organizations(
    search: string,
    page: number,
  ): Observable<Page<OrganizationOption>>;
  invite(body: InviteUser): Observable<User>;
  execute(command: UserCommand): Observable<void>;
}
export const USERS_GATEWAY = new InjectionToken<UsersGateway>('USERS_GATEWAY');
