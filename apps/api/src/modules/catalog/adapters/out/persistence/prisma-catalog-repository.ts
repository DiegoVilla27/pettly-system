import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from '../../../../../shared/infrastructure/database';
import { ApplicationError } from '../../../../../shared/domain/application-error';
import type {
  CatalogRepository,
  CatalogWork,
} from '../../../application/ports/out/catalog-repository';
import { CatalogPersistenceMapper as Mapper } from './catalog.mapper';
@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly db: Database) {}
  run<T>(callback: (tx: CatalogWork) => Promise<T>) {
    return this.db
      .transaction(() =>
        callback({
          lock: (key) => this.db.lock(key),
          category: async (id) => {
            const row = await this.db.client.catalogCategory.findUnique({
              where: { id },
            });
            return row ? Mapper.category(row) : null;
          },
          categoriesByIds: async (ids) =>
            (
              await this.db.client.catalogCategory.findMany({
                where: { id: { in: ids }, status: 'active' },
              })
            ).map(Mapper.category),
          categories: async (includeInactive) =>
            (
              await this.db.client.catalogCategory.findMany({
                where: includeInactive ? {} : { status: 'active' },
                take: 1000,
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
              })
            ).map(Mapper.category),
          saveCategory: async (state) => {
            await this.db.client.catalogCategory.upsert({
              where: { id: state.id },
              create: state,
              update: state,
            });
          },
          product: async (id) => {
            const row = await this.db.client.catalogProduct.findUnique({
              where: { id },
            });
            return row ? Mapper.product(row) : null;
          },
          productsByIds: async (ids) =>
            (
              await this.db.client.catalogProduct.findMany({
                where: { id: { in: ids } },
              })
            ).map(Mapper.product),
          saveProduct: async (state) => {
            await this.db.client.catalogProduct.upsert({
              where: { id: state.id },
              create: state,
              update: state,
            });
          },
          products: async (query, publicOnly) => {
            const where: Prisma.CatalogProductWhereInput = {
              ...(publicOnly
                ? {
                    status: 'published',
                    category: { status: 'active' },
                    variants: { some: { status: 'active' } },
                    photos: { some: {} },
                  }
                : query.status
                  ? { status: query.status }
                  : {}),
              ...(query.organizationId
                ? { organizationId: query.organizationId }
                : {}),
              ...(query.categoryId ? { categoryId: query.categoryId } : {}),
              ...(query.currency ? { currency: query.currency } : {}),
              ...(query.brand
                ? { brand: { equals: query.brand, mode: 'insensitive' } }
                : {}),
              ...(query.search
                ? { name: { contains: query.search, mode: 'insensitive' } }
                : {}),
              ...(query.minPriceMinor !== undefined ||
              query.maxPriceMinor !== undefined
                ? {
                    variants: {
                      some: {
                        status: 'active',
                        priceMinor: {
                          gte: query.minPriceMinor,
                          lte: query.maxPriceMinor,
                        },
                      },
                    },
                  }
                : {}),
            };
            const [items, total] = await Promise.all([
              this.db.client.catalogProduct.findMany({
                where,
                take: query.limit,
                skip: (query.page - 1) * query.limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              }),
              this.db.client.catalogProduct.count({ where }),
            ]);
            return {
              items: items.map(Mapper.product),
              total,
              page: query.page,
              limit: query.limit,
            };
          },
          variants: async (ids) =>
            (
              await this.db.client.catalogVariant.findMany({
                where: { productId: { in: ids } },
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
              })
            ).map(Mapper.variant),
          variantIds: async (ids) =>
            (
              await this.db.client.catalogVariant.findMany({
                where: { id: { in: ids } },
              })
            ).map(Mapper.variant),
          saveVariant: async (state) => {
            await this.db.client.catalogVariant.upsert({
              where: { id: state.id },
              create: state,
              update: state,
            });
          },
          photos: (ids) =>
            this.db.client.catalogPhoto.findMany({
              where: { productId: { in: ids } },
              orderBy: [{ position: 'asc' }, { id: 'asc' }],
            }),
          attach: async (state) => {
            await this.db.client.catalogPhoto.create({ data: state });
          },
          detach: async (id) => {
            await this.db.client.catalogPhoto.delete({ where: { id } });
          },
          audit: async (entry) => {
            await this.db.client.catalogAuditEntry.create({ data: entry });
          },
          audits: async (productId, page, limit, categoryId) => {
            const where = categoryId
              ? { categoryId, productId: null }
              : { productId };
            const [items, total] = await Promise.all([
              this.db.client.catalogAuditEntry.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              }),
              this.db.client.catalogAuditEntry.count({ where }),
            ]);
            return { items, total, page, limit };
          },
        }),
      )
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2002', 'P2003'].includes(error.code)
        )
          throw new ApplicationError(
            'CONFLICT',
            'A catalog identifier is already used or its relation is invalid.',
          );
        throw error;
      });
  }
}
