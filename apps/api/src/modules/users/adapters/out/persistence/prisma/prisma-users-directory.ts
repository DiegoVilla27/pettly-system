import { Injectable } from '@nestjs/common';
import { Database } from '../../../../../../shared/infrastructure/database';
import { ApplicationError } from '../../../../../../shared/domain/application-error';
import type {
  NewProfile,
  ProfileChanges,
} from '../../../../application/results/user-profile';
import { User } from '../../../../domain/aggregates/user';
import type { UsersDirectory } from '../../../../application/ports/out/users-directory';
import { UserPersistenceMapper } from './user.mapper';
@Injectable()
export class PrismaUsersDirectory implements UsersDirectory {
  constructor(private readonly db: Database) {}
  async findById(id: string) {
    const row = await this.db.client.user.findUnique({ where: { id } });
    return row ? UserPersistenceMapper.toDomain(row).snapshot() : null;
  }
  async findByEmail(email: string) {
    const row = await this.db.client.user.findUnique({ where: { email } });
    return row ? UserPersistenceMapper.toDomain(row).snapshot() : null;
  }
  async create(id: string, email: string, profile: NewProfile, now: Date) {
    const user = User.create(id, email, profile, now);
    const row = await this.db.client.user.create({
      data: UserPersistenceMapper.toPersistence(user),
    });
    return UserPersistenceMapper.toDomain(row).snapshot();
  }
  countActiveSuperAdmins() {
    return this.db.client.user.count({
      where: {
        globalRole: 'super_admin',
        status: 'active',
        emailVerifiedAt: { not: null },
      },
    });
  }
  async audit(
    entry: import('../../../../application/ports/out/users-administration').UserAuditEntry,
  ) {
    await this.db.client.userAuditEntry.create({ data: entry });
  }
  async changeEmail(id: string, email: string, now: Date) {
    const row = await this.db.client.user.findUnique({ where: { id } });
    if (!row)
      throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
    const user = UserPersistenceMapper.toDomain(row);
    user.changeEmail(email, now);
    await this.db.client.user.update({
      where: { id },
      data: UserPersistenceMapper.toPersistence(user),
    });
  }
  async anonymize(id: string, now: Date) {
    const row = await this.db.client.user.findUnique({ where: { id } });
    if (!row)
      throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
    const user = UserPersistenceMapper.toDomain(row);
    user.anonymize(now);
    await this.db.client.user.update({
      where: { id },
      data: UserPersistenceMapper.toPersistence(user),
    });
  }
  async verifyEmail(id: string, now: Date) {
    const row = await this.db.client.user.findUnique({ where: { id } });
    if (!row)
      throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
    const user = UserPersistenceMapper.toDomain(row);
    user.verifyEmail(now);
    await this.db.client.user.update({
      where: { id },
      data: {
        emailVerifiedAt: user.snapshot().emailVerifiedAt,
        updatedAt: now,
      },
    });
  }
  async updateProfile(id: string, changes: ProfileChanges, now: Date) {
    return this.db.transaction(async () => {
      await this.db.lock(`user:${id}`);
      const row = await this.db.client.user.findUnique({ where: { id } });
      if (!row)
        throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
      const user = UserPersistenceMapper.toDomain(row);
      user.updateProfile(changes, now);
      const updated = await this.db.client.user.update({
        where: { id },
        data: UserPersistenceMapper.toPersistence(user),
      });
      return UserPersistenceMapper.toDomain(updated).snapshot();
    });
  }
}
