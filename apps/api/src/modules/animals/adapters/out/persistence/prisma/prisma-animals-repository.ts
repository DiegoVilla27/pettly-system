import { Injectable } from '@nestjs/common';
import { Database } from '../../../../../../shared/infrastructure/database';
import type {
  AnimalsRepository,
  AnimalsWork,
} from '../../../../application/ports/out/animals-repository';
import { AnimalPersistenceMapper as Mapper } from './animal.mapper';
@Injectable()
export class PrismaAnimalsRepository implements AnimalsRepository {
  constructor(private readonly db: Database) {}
  run<T>(callback: (work: AnimalsWork) => Promise<T>) {
    return this.db.transaction(() =>
      callback({
        lock: (key) => this.db.lock(key),
        find: async (id) => {
          const row = await this.db.client.animal.findUnique({ where: { id } });
          return row ? Mapper.result(row) : null;
        },
        findMany: async (ids) =>
          (
            await this.db.client.animal.findMany({ where: { id: { in: ids } } })
          ).map(Mapper.result),
        create: async (state) => {
          await this.db.client.animal.create({ data: Mapper.data(state) });
        },
        save: async (state) => {
          await this.db.client.animal.update({
            where: { id: state.id },
            data: Mapper.data(state),
          });
        },
        list: async (query) => {
          const where = {
            ...(query.organizationId
              ? { organizationId: query.organizationId }
              : { ownerUserId: query.actorId }),
            ...(query.species ? { species: query.species } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.search
              ? {
                  name: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                }
              : {}),
          };
          const [items, total] = await Promise.all([
            this.db.client.animal.findMany({
              where,
              take: query.limit,
              skip: (query.page - 1) * query.limit,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            }),
            this.db.client.animal.count({ where }),
          ]);
          return {
            items: items.map(Mapper.result),
            total,
            page: query.page,
            limit: query.limit,
          };
        },
        photosMany: (ids) =>
          this.db.client.animalPhoto.findMany({
            where: { animalId: { in: ids } },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
          }),
        photos: (animalId) =>
          this.db.client.animalPhoto.findMany({
            where: { animalId },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
          }),
        attach: async (photo) => {
          await this.db.client.animalPhoto.create({ data: photo });
        },
        removePhoto: async (id) => {
          await this.db.client.animalPhoto.delete({ where: { id } });
        },
        audit: async (entry) => {
          await this.db.client.animalAuditEntry.create({ data: entry });
        },
        audits: async (animalId, page, limit) => {
          const where = { animalId };
          const [items, total] = await Promise.all([
            this.db.client.animalAuditEntry.findMany({
              where,
              take: limit,
              skip: (page - 1) * limit,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            }),
            this.db.client.animalAuditEntry.count({ where }),
          ]);
          return { items, total, page, limit };
        },
      }),
    );
  }
}
