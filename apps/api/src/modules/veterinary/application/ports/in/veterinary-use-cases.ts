import type {
  ConfigureCredentialCommand,
  CredentialActionCommand,
  CredentialDocumentCommand,
} from '../../commands/credential.commands';
import type {
  CredentialQuery,
  CredentialsQuery,
} from '../../queries/credential.queries';
import type { CredentialState } from '../../results/credential';
import type { CredentialAudit } from '../out/credentials-repository';
export interface VeterinaryUseCases {
  configure(c: ConfigureCredentialCommand): Promise<CredentialState>;
  action(c: CredentialActionCommand): Promise<CredentialState>;
  upload(c: CredentialDocumentCommand): Promise<CredentialState>;
  remove(c: CredentialDocumentCommand): Promise<CredentialState>;
  get(q: CredentialQuery): Promise<CredentialState>;
  list(
    q: CredentialsQuery,
  ): Promise<{ items: CredentialState[]; total: number }>;
  document(q: CredentialQuery, mediaId: string): Promise<Uint8Array>;
  audits(
    q: CredentialQuery,
    page: number,
    limit: number,
  ): Promise<{ items: CredentialAudit[]; total: number }>;
}
export const VETERINARY_USE_CASES = Symbol('VETERINARY_USE_CASES');
