import type {
  ConfigureCredentialCommand,
  CredentialActionCommand,
  CredentialDocumentCommand,
} from '../../commands/credential.commands';
import type {
  CredentialQuery,
  CredentialsQuery,
  EligibleCredentialsQuery,
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
  mine(
    q: CredentialsQuery,
  ): Promise<{ items: CredentialState[]; total: number }>;
  eligibleList(q: EligibleCredentialsQuery): Promise<{
    items: {
      id: string;
      organizationId: string;
      professionalId: string;
      professionalName: string;
      resourceId: string;
      verifiedUntil: Date;
    }[];
    candidateTotal: number;
  }>;
  document(q: CredentialQuery, mediaId: string): Promise<Uint8Array>;
  audits(
    q: CredentialQuery,
    page: number,
    limit: number,
  ): Promise<{ items: CredentialAudit[]; total: number }>;
}
export const VETERINARY_USE_CASES = Symbol('VETERINARY_USE_CASES');
