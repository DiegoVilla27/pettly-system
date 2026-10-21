import type { CredentialState } from '../../results/credential';
import type { CredentialsQuery } from '../../queries/credential.queries';
export interface CredentialAudit {
  id: string;
  credentialId: string;
  actorId: string;
  action: string;
  version: number;
  snapshot: CredentialState;
  reason: string;
  requestId: string;
  createdAt: Date;
}
export interface CredentialsWork {
  lock(key: string): Promise<void>;
  find(id: string): Promise<CredentialState | null>;
  save(s: CredentialState): Promise<void>;
  list(
    q: CredentialsQuery,
  ): Promise<{ items: CredentialState[]; total: number }>;
  audit(a: CredentialAudit): Promise<void>;
  audits(
    id: string,
    page: number,
    limit: number,
  ): Promise<{ items: CredentialAudit[]; total: number }>;
}
export interface CredentialsRepository {
  run<T>(fn: (tx: CredentialsWork) => Promise<T>): Promise<T>;
}
export const CREDENTIALS_REPOSITORY = Symbol('CREDENTIALS_REPOSITORY');
