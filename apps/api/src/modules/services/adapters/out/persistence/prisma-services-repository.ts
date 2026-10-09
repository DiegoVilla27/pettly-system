import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from '../../../../../shared/infrastructure/database';
import type {
  ServicesRepository,
  ServicesWork,
} from '../../../application/ports/out/services-repository';
import { ServicesPersistenceMapper as M } from './services.mapper';
@Injectable()
export class PrismaServicesRepository implements ServicesRepository {
  constructor(private readonly db: Database) {}
  run<T>(work: (tx: ServicesWork) => Promise<T>) {
    return this.db.transaction(() =>
      work({
        lock: (key) => this.db.lock(key),
        service: async (id) => {
          const r = await this.db.client.serviceRecord.findUnique({
            where: { id },
          });
          return r ? M.service(r.snapshot) : null;
        },
        saveService: async (s) => {
          const data = {
            id: s.id,
            organizationId: s.organizationId,
            name: s.name,
            category: s.category,
            kind: s.kind,
            status: s.status,
            version: s.version,
            snapshot: M.json(s),
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          };
          if (
            await this.db.client.serviceRecord.findUnique({
              where: { id: s.id },
              select: { id: true },
            })
          )
            await this.db.client.serviceRecord.update({
              where: { id: s.id },
              data,
            });
          else await this.db.client.serviceRecord.create({ data });
        },
        resource: async (id) => {
          const r = await this.db.client.serviceResource.findUnique({
            where: { id },
          });
          return r ? M.resource(r.snapshot) : null;
        },
        saveResource: async (s) => {
          const data = {
            id: s.id,
            organizationId: s.organizationId,
            kind: s.kind,
            status: s.status,
            capacity: s.capacity,
            version: s.version,
            snapshot: M.json(s),
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          };
          if (
            await this.db.client.serviceResource.findUnique({
              where: { id: s.id },
              select: { id: true },
            })
          )
            await this.db.client.serviceResource.update({
              where: { id: s.id },
              data,
            });
          else await this.db.client.serviceResource.create({ data });
        },
        resources: async (organizationId) =>
          (
            await this.db.client.serviceResource.findMany({
              where: { organizationId },
              orderBy: { id: 'asc' },
              take: 100,
            })
          ).map((r) => M.resource(r.snapshot)),
        blocks: async (resourceId, from, to) =>
          this.db.client.serviceBlock.findMany({
            where: {
              resourceId,
              releasedAt: null,
              startsAt: { lt: to },
              endsAt: { gt: from },
            },
            orderBy: { startsAt: 'asc' },
          }),
        block: (id) =>
          this.db.client.serviceBlock.findUnique({ where: { id } }),
        saveBlock: async (b) => {
          if (
            await this.db.client.serviceBlock.findUnique({
              where: { id: b.id },
              select: { id: true },
            })
          )
            await this.db.client.serviceBlock.update({
              where: { id: b.id },
              data: b,
            });
          else await this.db.client.serviceBlock.create({ data: b });
        },
        list: async (q) => {
          const where: Prisma.ServiceRecordWhereInput = {
            ...(q.organizationId ? { organizationId: q.organizationId } : {}),
            status: q.actorId ? q.status : 'published',
            ...(q.category ? { category: q.category } : {}),
            ...(q.kind ? { kind: q.kind } : {}),
            ...(q.search
              ? { name: { contains: q.search, mode: 'insensitive' } }
              : {}),
          };
          const [rows, total] = await Promise.all([
            this.db.client.serviceRecord.findMany({
              where,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              skip: (q.page - 1) * q.limit,
              take: q.limit,
            }),
            this.db.client.serviceRecord.count({ where }),
          ]);
          return { items: rows.map((r) => M.service(r.snapshot)), total };
        },
        audit: async (a) => {
          await this.db.client.serviceAuditEntry.create({
            data: { ...a, snapshot: M.json(a.snapshot) },
          });
        },
        audits: async (serviceId, page, limit) => {
          const where = { serviceId };
          const [items, total] = await Promise.all([
            this.db.client.serviceAuditEntry.findMany({
              where,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              skip: (page - 1) * limit,
              take: limit,
            }),
            this.db.client.serviceAuditEntry.count({ where }),
          ]);
          return { items, total };
        },
      }),
    );
  }
}
