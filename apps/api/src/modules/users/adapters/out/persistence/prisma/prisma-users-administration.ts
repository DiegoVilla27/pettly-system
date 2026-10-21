import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../../../../../shared/infrastructure/database';
import { ApplicationError } from '../../../../../../shared/domain/application-error';
import {
  SESSION_REVOCATION,
  type SessionRevocation,
} from '../../../../../auth/application/ports/in/session-revocation';
import type {
  UsersAdministration,
  UsersAdministrationWork,
} from '../../../../application/ports/out/users-administration';
import { UserPersistenceMapper } from './user.mapper';
@Injectable()
export class PrismaUsersAdministration implements UsersAdministration {
  constructor(
    private readonly db: Database,
    @Inject(SESSION_REVOCATION) private readonly sessions: SessionRevocation,
  ) {}
  run<T>(work: (context: UsersAdministrationWork) => Promise<T>) {
    return this.db.transaction(() =>
      work({
        lock: (key) => this.db.lock(key),
        findById: async (id) => {
          const row = await this.db.client.user.findUnique({ where: { id } });
          return row ? UserPersistenceMapper.toDomain(row).snapshot() : null;
        },
        findByEmail: async (email) => {
          const row = await this.db.client.user.findUnique({
            where: { email },
          });
          return row ? UserPersistenceMapper.toDomain(row).snapshot() : null;
        },
        countSuperAdmins: (activeOnly) =>
          this.db.client.user.count({
            where: {
              globalRole: 'super_admin',
              ...(activeOnly
                ? { status: 'active', emailVerifiedAt: { not: null } }
                : {}),
            },
          }),
        listAudit: async (query) => {
          const where = { targetId: query.userId };
          const [items, total] = await Promise.all([
            this.db.client.userAuditEntry.findMany({
              where,
              skip: (query.page - 1) * query.limit,
              take: query.limit,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            }),
            this.db.client.userAuditEntry.count({ where }),
          ]);
          return {
            items: items.map((row) => ({
              ...row,
              action:
                row.action as import('../../../../application/ports/out/users-administration').UserAuditEntry['action'],
            })),
            total,
            page: query.page,
            limit: query.limit,
          };
        },
        list: async (query) => {
          const where = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.role ? { globalRole: query.role } : {}),
            ...(query.organizationRole
              ? { memberships: { some: { role: query.organizationRole } } }
              : {}),
            ...(query.emailVerified !== undefined
              ? { emailVerifiedAt: query.emailVerified ? { not: null } : null }
              : {}),
            ...(query.search
              ? {
                  OR: ['email', 'name', 'lastName'].map((field) => ({
                    [field]: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  })),
                }
              : {}),
          };
          const [rows, total] = await Promise.all([
            this.db.client.user.findMany({
              where,
              skip: (query.page - 1) * query.limit,
              take: query.limit,
              orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
            }),
            this.db.client.user.count({ where }),
          ]);
          return {
            items: rows.map((row) =>
              UserPersistenceMapper.toDomain(row).snapshot(),
            ),
            total,
            page: query.page,
            limit: query.limit,
          };
        },
        updateProfile: async (id, changes, now) => {
          const user = await this.load(id);
          user.updateProfileByAdministrator(changes, now);
          return this.save(user);
        },
        setStatus: async (id, status, now) => {
          const user = await this.load(id);
          user.changeStatus(status, now);
          return this.save(user);
        },
        grantSuperAdmin: async (id, now) => {
          const user = await this.load(id);
          user.grantSuperAdmin(now);
          return this.save(user);
        },
        setGlobalRole: async (id, role, now) => {
          const user = await this.load(id);
          user.changeGlobalRole(role, now);
          return this.save(user);
        },
        revokeSessions: (id, now) => this.sessions.revokeAll(id, now),
        audit: async (entry) => {
          await this.db.client.userAuditEntry.create({ data: entry });
        },
      }),
    );
  }
  private async load(id: string) {
    const row = await this.db.client.user.findUnique({ where: { id } });
    if (!row)
      throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
    return UserPersistenceMapper.toDomain(row);
  }
  private async save(user: ReturnType<typeof UserPersistenceMapper.toDomain>) {
    const row = await this.db.client.user.update({
      where: { id: user.snapshot().id },
      data: UserPersistenceMapper.toPersistence(user),
    });
    return UserPersistenceMapper.toDomain(row).snapshot();
  }
}
