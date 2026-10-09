import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { Database } from '../../../../../../shared/infrastructure/database';
import { ApplicationError } from '../../../../../../shared/domain/application-error';
import type {
  AdoptionsRepository,
  AdoptionsWork,
} from '../../../../application/ports/out/adoptions-repository';
import { AdoptionPersistenceMapper as Mapper } from './adoption.mapper';
@Injectable()
export class PrismaAdoptionsRepository implements AdoptionsRepository {
  constructor(private readonly db: Database) {}
  run<T>(callback: (work: AdoptionsWork) => Promise<T>) {
    return this.db
      .transaction(() =>
        callback({
          pendingPublications: async (page, limit) => {
            const where = { status: 'pending' };
            const [items, total] = await Promise.all([
              this.db.client.adoptionPublication.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
              }),
              this.db.client.adoptionPublication.count({ where }),
            ]);
            return { items: items.map(Mapper.publication), total, page, limit };
          },
          lock: (key) => this.db.lock(key),
          findPublication: async (id) => {
            const row = await this.db.client.adoptionPublication.findUnique({
              where: { id },
            });
            return row ? Mapper.publication(row) : null;
          },
          createPublication: async (state) => {
            await this.db.client.adoptionPublication.create({
              data: Mapper.publicationData(state),
            });
          },
          savePublication: async (state) => {
            await this.db.client.adoptionPublication.update({
              where: { id: state.id },
              data: Mapper.publicationData(state),
            });
          },
          publicCandidates: async (query) => {
            let cursor: Prisma.AdoptionPublicationWhereInput = {};
            if (query.cursor) {
              const row = await this.db.client.adoptionPublication.findFirst({
                where: { id: query.cursor, publishedAt: { not: null } },
              });
              if (!row)
                throw new ApplicationError(
                  'INVALID_INPUT',
                  'Unknown publication cursor.',
                );
              cursor = {
                OR: [
                  { createdAt: { lt: row.createdAt } },
                  { createdAt: row.createdAt, id: { lt: row.id } },
                ],
              };
            }
            const where: Prisma.AdoptionPublicationWhereInput = {
              status: 'published',
              AND: [cursor],
              ...(query.search
                ? {
                    OR: [
                      {
                        title: { contains: query.search, mode: 'insensitive' },
                      },
                      {
                        description: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  }
                : {}),
              ...(query.species
                ? { snapshot: { path: ['species'], equals: query.species } }
                : {}),
              ...(query.countryCode ? { countryCode: query.countryCode } : {}),
              ...(query.city
                ? { city: { contains: query.city, mode: 'insensitive' } }
                : {}),
            };
            const rows = await this.db.client.adoptionPublication.findMany({
              where,
              take: 201,
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            });
            const items = rows.slice(0, 200).map(Mapper.publication);
            return {
              items,
              nextCursor: rows.length > 200 ? items.at(-1)!.id : null,
            };
          },
          publications: async (query) => {
            const where = {
              organizationId: query.organizationId,
              ...(query.status ? { status: query.status } : {}),
            };
            const [items, total] = await Promise.all([
              this.db.client.adoptionPublication.findMany({
                where,
                take: query.limit,
                skip: (query.page - 1) * query.limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              }),
              this.db.client.adoptionPublication.count({ where }),
            ]);
            return {
              items: items.map(Mapper.publication),
              total,
              page: query.page,
              limit: query.limit,
            };
          },
          findRequest: async (id) => {
            const row = await this.db.client.adoptionRequest.findUnique({
              where: { id },
            });
            return row ? Mapper.request(row) : null;
          },
          createRequest: async (state) => {
            await this.db.client.adoptionRequest.create({ data: state });
          },
          saveRequest: async (state) => {
            await this.db.client.adoptionRequest.update({
              where: { id: state.id },
              data: state,
            });
          },
          requests: async (query) => {
            const where = {
              ...(query.publicationId
                ? { publicationId: query.publicationId }
                : { applicantId: query.actorId }),
              ...(query.status ? { status: query.status } : {}),
            };
            const [items, total] = await Promise.all([
              this.db.client.adoptionRequest.findMany({
                where,
                take: query.limit,
                skip: (query.page - 1) * query.limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              }),
              this.db.client.adoptionRequest.count({ where }),
            ]);
            return {
              items: items.map(Mapper.request),
              total,
              page: query.page,
              limit: query.limit,
            };
          },
          openRequests: async (publicationId) =>
            (
              await this.db.client.adoptionRequest.findMany({
                where: {
                  publicationId,
                  status: { in: ['submitted', 'in_review', 'approved'] },
                },
              })
            ).map(Mapper.request),
          audit: async (entry) => {
            await this.db.client.adoptionAuditEntry.create({ data: entry });
          },
          audits: async (publicationId, page, limit) => {
            const where = { publicationId };
            const [items, total] = await Promise.all([
              this.db.client.adoptionAuditEntry.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              }),
              this.db.client.adoptionAuditEntry.count({ where }),
            ]);
            return { items, total, page, limit };
          },
        }),
      )
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        )
          throw new ApplicationError(
            'CONFLICT',
            'An open publication or adoption request already exists, or another applicant is already approved.',
          );
        throw error;
      });
  }
}
