import { InjectionToken, type Signal } from '@angular/core';
import type { ApiResponse } from '@pettly/api-client';
import type { ApiProblem } from '../../api/api-problem';
export type GlobalRole = ApiResponse<'getCurrentUserAccess'>['globalRole'];
export type Permission =
  ApiResponse<'getCurrentUserAccess'>['globalPermissions'][number];
export interface SessionIdentity {
  readonly id: string;
  readonly name: string;
  readonly fullName: string;
  readonly initials: string;
  readonly email: string;
  readonly role: GlobalRole;
  readonly roleLabel: string;
  readonly verified: boolean;
  readonly globalPermissions: readonly Permission[];
  readonly organizations: ApiResponse<'getCurrentUserAccess'>['organizations'];
  readonly backofficeAllowed: boolean;
}
export type SessionState =
  | { phase: 'loading' | 'anonymous' }
  | { phase: 'unavailable'; problem: ApiProblem }
  | { phase: 'authenticated'; identity: SessionIdentity };
export interface AuthSession {
  readonly state: Signal<SessionState>;
  readonly identity: Signal<SessionIdentity | null>;
  readonly busy: Signal<boolean>;
  ensureReady(): Promise<void>;
  restore(): Promise<void>;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  expire(): void;
  hasPermission(permission: Permission, organizationId?: string): boolean;
}
export const AUTH_SESSION = new InjectionToken<AuthSession>('AUTH_SESSION');
