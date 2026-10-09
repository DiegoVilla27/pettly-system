import type { SessionState } from '../../../domain/aggregates/session';
import type { UsersDirectory } from '../../../../users/application/ports/out/users-directory';
export type TokenPurpose =
  'verification' | 'reset' | 'invitation' | 'email_change';
export type EmailPurpose =
  | TokenPurpose
  | 'password_changed'
  | 'email_changed'
  | 'email_change_requested';
export interface ActionTokenState {
  hash: string;
  userId: string;
  purpose: string;
  expiresAt: Date;
  consumedAt: Date | null;
}
export interface AuthRepository {
  pendingEmail(userId: string): Promise<string | null>;
  setPendingEmail(userId: string, email: string | null): Promise<void>;
  invalidateAllActionTokens(userId: string, now: Date): Promise<void>;
  eraseAuthentication(userId: string, now: Date): Promise<void>;
  sessions(
    userId: string,
    now: Date,
    page: number,
    limit: number,
  ): Promise<{ items: SessionState[]; total: number }>;
  passwordHash(userId: string): Promise<string | null>;
  savePassword(userId: string, hash: string): Promise<void>;
  session(id: string): Promise<SessionState | null>;
  addSession(state: SessionState, tokenHash: string): Promise<void>;
  refreshToken(
    hash: string,
  ): Promise<{ session: SessionState; consumedAt: Date | null } | null>;
  rotateRefresh(
    oldHash: string,
    newHash: string,
    sessionId: string,
    now: Date,
  ): Promise<void>;
  revokeSession(id: string, now: Date): Promise<void>;
  revokeAll(userId: string, now: Date): Promise<void>;
  actionToken(hash: string): Promise<ActionTokenState | null>;
  replaceActionToken(state: ActionTokenState): Promise<void>;
  consumeActionToken(hash: string, now: Date): Promise<void>;
  invalidateActionTokens(
    userId: string,
    purpose: TokenPurpose,
    now: Date,
  ): Promise<void>;
}
export interface AuthWork {
  users: UsersDirectory;
  auth: AuthRepository;
  lock(key: string): Promise<void>;
  cancelEmail(to: string, purpose: EmailPurpose, userId: string): Promise<void>;
  enqueueEmail(email: {
    userId: string;
    id: string;
    to: string;
    token: string;
    purpose: EmailPurpose;
    expiresAt: Date;
  }): Promise<void>;
}
export interface AuthUnitOfWork {
  run<T>(work: (context: AuthWork) => Promise<T>): Promise<T>;
}
export const AUTH_UNIT_OF_WORK = Symbol('AUTH_UNIT_OF_WORK');
