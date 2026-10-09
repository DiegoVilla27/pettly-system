import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from '../../../../../shared/infrastructure/database';
import { ApplicationError } from '../../../../../shared/domain/application-error';
import type {
  InventoryRepository,
  InventoryWork,
} from '../../../application/ports/out/inventory-repository';
import { InventoryPersistenceMapper as Mapper } from './inventory.mapper';
@Injectable()
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly db: Database) {}
  run<T>(callback: (tx: InventoryWork) => Promise<T>) {
    return this.db
      .transaction(() =>
        callback({
          lock: (key) => this.db.lock(key),
          stock: (variantId) =>
            this.db.client.inventoryStock.findUnique({ where: { variantId } }),
          availability: async (ids, now) => {
            if (!ids.length) return [];
            const values = Prisma.join(
              ids.map((id) => Prisma.sql`${id}::uuid`),
            );
            return this.db.client.$queryRaw<
              { variantId: string; available: number }[]
            >(
              Prisma.sql`SELECT s."variantId",s."onHand"-COALESCE(h.quantity,0)::int AS available FROM inventory_stock s LEFT JOIN (SELECT "variantId",sum(quantity) AS quantity FROM inventory_holds WHERE "variantId" IN (${values}) AND status='active' AND "expiresAt">${now} GROUP BY "variantId") h ON h."variantId"=s."variantId" WHERE s."variantId" IN (${values})`,
            );
          },
          saveStock: async (state) => {
            await this.db.client.inventoryStock.upsert({
              where: { variantId: state.variantId },
              create: state,
              update: state,
            });
          },
          hold: async (id) => {
            const row = await this.db.client.inventoryHold.findUnique({
              where: { id },
            });
            return row ? Mapper.hold(row) : null;
          },
          holds: async (variantId) =>
            (
              await this.db.client.inventoryHold.findMany({
                where: { variantId, status: 'active' },
                orderBy: { id: 'asc' },
              })
            ).map(Mapper.hold),
          expireHolds: async (ids, now) => {
            await this.db.client.inventoryHold.updateMany({
              where: { id: { in: ids }, status: 'active' },
              data: { status: 'expired', updatedAt: now },
            });
          },
          addMovements: async (items) => {
            await this.db.client.inventoryMovement.createMany({ data: items });
          },
          saveHold: async (state) => {
            await this.db.client.inventoryHold.upsert({
              where: { id: state.id },
              create: state,
              update: state,
            });
          },
          expiredVariants: async (now) =>
            (
              await this.db.client.inventoryHold.groupBy({
                by: ['variantId'],
                where: { status: 'active', expiresAt: { lte: now } },
                _min: { expiresAt: true },
                orderBy: { _min: { expiresAt: 'asc' } },
                take: 100,
              })
            ).map((row) => row.variantId),
          movement: (organizationId, idempotencyKey) =>
            this.db.client.inventoryMovement.findUnique({
              where: {
                organizationId_idempotencyKey: {
                  organizationId,
                  idempotencyKey,
                },
              },
            }),
          addMovement: async (state) => {
            await this.db.client.inventoryMovement.create({ data: state });
          },
          movements: async (variantId, page, limit) => {
            const where = { variantId };
            const [items, total] = await Promise.all([
              this.db.client.inventoryMovement.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              }),
              this.db.client.inventoryMovement.count({ where }),
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
            'An idempotency key was concurrently used. Retry the exact request.',
          );
        throw error;
      });
  }
}
