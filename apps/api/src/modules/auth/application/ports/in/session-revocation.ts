export interface SessionRevocation {
  revokeAll(userId: string, now: Date): Promise<void>;
}
export const SESSION_REVOCATION = Symbol('SESSION_REVOCATION');
