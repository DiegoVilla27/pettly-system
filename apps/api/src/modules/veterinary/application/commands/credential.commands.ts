import type { CredentialProfile, CredentialState } from '../results/credential';
export class ConfigureCredentialCommand {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly professionalId: string,
    readonly resourceId: string,
    readonly profile: CredentialProfile,
    readonly reason: string,
    readonly requestId: string,
    readonly id?: string,
    readonly expectedVersion = 1,
  ) {}
}
export class CredentialActionCommand {
  constructor(
    readonly actorId: string,
    readonly id: string,
    readonly expectedVersion: number,
    readonly reason: string,
    readonly requestId: string,
    readonly action: 'submit' | 'review' | 'revoke',
    readonly approved = false,
    readonly verifiedUntil: Date | null = null,
    readonly verificationReference: string | null = null,
  ) {}
}
export class CredentialDocumentCommand {
  constructor(
    readonly actorId: string,
    readonly id: string,
    readonly expectedVersion: number,
    readonly reason: string,
    readonly requestId: string,
    readonly kind: CredentialState['documents'][number]['kind'],
    readonly bytes: Uint8Array,
    readonly mime: string,
    readonly mediaId?: string,
  ) {}
}
