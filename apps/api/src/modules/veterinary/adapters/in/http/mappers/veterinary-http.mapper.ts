import type { CredentialState } from '../../../../application/results/credential';
export class VeterinaryHttpMapper {
  static credential(s: CredentialState) {
    return {
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
      verifiedUntil: s.verifiedUntil?.toISOString() ?? null,
    };
  }
}
