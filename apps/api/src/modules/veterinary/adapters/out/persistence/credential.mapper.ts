import { Prisma } from '@prisma/client';
import type { CredentialState } from '../../../application/results/credential';
export class CredentialPersistenceMapper {
  static json(s: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(s)) as Prisma.InputJsonValue;
  }
  static state(value: Prisma.JsonValue): CredentialState {
    const s = value as unknown as CredentialState;
    return {
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : null,
      verifiedUntil: s.verifiedUntil ? new Date(s.verifiedUntil) : null,
    };
  }
}
