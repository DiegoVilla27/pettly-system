import type { User as PrismaUser } from '@prisma/client';
import {
  User,
  type UserStatus,
  type GlobalRole,
} from '../../../../domain/aggregates/user';
export class UserPersistenceMapper {
  static toDomain(row: PrismaUser): User {
    return User.restore({
      ...row,
      status: row.status as UserStatus,
      globalRole: row.globalRole as GlobalRole,
      dateOfBirth: row.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    });
  }
  static toPersistence(user: User) {
    const state = user.snapshot();
    return {
      ...state,
      dateOfBirth: state.dateOfBirth
        ? new Date(state.dateOfBirth + 'T00:00:00.000Z')
        : null,
    };
  }
}
