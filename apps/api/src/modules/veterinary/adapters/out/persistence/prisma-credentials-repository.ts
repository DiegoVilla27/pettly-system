import { Injectable } from '@nestjs/common';
import { Database } from '../../../../../shared/infrastructure/database';
import type {
  CredentialsRepository,
  CredentialsWork,
} from '../../../application/ports/out/credentials-repository';
import { CredentialPersistenceMapper as M } from './credential.mapper';
@Injectable()
export class PrismaCredentialsRepository implements CredentialsRepository {
  constructor(private readonly db: Database) {}
  run<T>(fn: (tx: CredentialsWork) => Promise<T>) {
    return this.db.transaction(() =>
      fn({
        lock: (k) => this.db.lock(k),
        find: async (id) => {
          const r = await this.db.client.veterinaryCredential.findUnique({
            where: { id },
          });
          return r ? M.state(r.snapshot) : null;
        },
        save: async (s) => {
          const data = {
            organizationId: s.organizationId,
            professionalId: s.professionalId,
            resourceId: s.resourceId,
            profession: s.profession,
            registrationNumber: s.registrationNumber,
            status: s.status,
            version: s.version,
            verifiedUntil: s.verifiedUntil,
            snapshot: M.json(s),
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          };
          if (
            await this.db.client.veterinaryCredential.findUnique({
              where: { id: s.id },
              select: { id: true },
            })
          )
            await this.db.client.veterinaryCredential.update({
              where: { id: s.id },
              data,
            });
          else
            await this.db.client.veterinaryCredential.create({
              data: { id: s.id, ...data },
            });
        },
        list: async (q) => {
          const where = {
            ...(q.organizationId ? { organizationId: q.organizationId } : {}),
            ...(q.status ? { status: q.status } : {}),
          };
          const [rows, total] = await Promise.all([
            this.db.client.veterinaryCredential.findMany({
              where,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              take: q.limit,
              skip: (q.page - 1) * q.limit,
            }),
            this.db.client.veterinaryCredential.count({ where }),
          ]);
          return { items: rows.map((r) => M.state(r.snapshot)), total };
        },
        audit: async (a) => {
          await this.db.client.veterinaryCredentialAudit.create({
            data: { ...a, snapshot: M.json(a.snapshot) },
          });
        },
        audits: async (credentialId, page, limit) => {
          const where = { credentialId };
          const [rows, total] = await Promise.all([
            this.db.client.veterinaryCredentialAudit.findMany({
              where,
              orderBy: { version: 'desc' },
              take: limit,
              skip: (page - 1) * limit,
            }),
            this.db.client.veterinaryCredentialAudit.count({ where }),
          ]);
          return {
            items: rows.map((r) => ({ ...r, snapshot: M.state(r.snapshot) })),
            total,
          };
        },
      }),
    );
  }
}
