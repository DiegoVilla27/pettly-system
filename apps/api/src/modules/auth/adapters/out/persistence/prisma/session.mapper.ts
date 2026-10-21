import type { Session as PrismaSession } from '@prisma/client';
import { Session } from '../../../../domain/aggregates/session';
export class SessionPersistenceMapper {
  static toDomain(row: PrismaSession) {
    return new Session({ ...row });
  }
}
