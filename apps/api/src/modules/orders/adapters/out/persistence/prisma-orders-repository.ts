import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from '../../../../../shared/infrastructure/database';
import { ApplicationError } from '../../../../../shared/domain/application-error';
import type {
  OrdersRepository,
  OrdersWork,
} from '../../../application/ports/out/orders-repository';
import type { PolicyAudit } from '../../../application/results/order';
import { OrdersPersistenceMapper as M } from './orders.mapper';
@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly db: Database) {}
  run<T>(work: (tx: OrdersWork) => Promise<T>) {
    return this.db
      .transaction(() =>
        work({
          lock: (key) => this.db.lock(key),
          policy: async (organizationId) => {
            const r = await this.db.client.orderPolicy.findUnique({
              where: { organizationId },
            });
            return r ? M.policy(r) : null;
          },
          savePolicy: async (s) => {
            const data = M.policyData(s);
            await this.db.client.orderPolicy.upsert({
              where: { organizationId: s.organizationId },
              create: data,
              update: data,
            });
          },
          policyAudit: async (
            actorId,
            organizationId,
            version,
            reason,
            requestId,
            createdAt,
            id,
          ) => {
            await this.db.client.orderPolicyAuditEntry.create({
              data: {
                actorId,
                organizationId,
                version,
                reason,
                requestId,
                createdAt,
                id,
                snapshot: (
                  await this.db.client.orderPolicy.findUniqueOrThrow({
                    where: { organizationId },
                  })
                ).data as Prisma.InputJsonValue,
              },
            });
          },
          quote: async (id) => {
            const r = await this.db.client.checkoutQuote.findUnique({
              where: { id },
            });
            return r ? M.quote(r) : null;
          },
          saveQuote: async (q) => {
            await this.db.client.checkoutQuote.create({ data: M.quoteData(q) });
          },
          order: async (id) => {
            const r = await this.db.client.order.findUnique({ where: { id } });
            return r ? M.order(r) : null;
          },
          replay: async (buyerId, idempotencyKey) => {
            const r = await this.db.client.order.findUnique({
              where: { buyerId_idempotencyKey: { buyerId, idempotencyKey } },
            });
            return r ? M.order(r) : null;
          },
          saveOrder: async (s) => {
            const data = M.orderData(s);
            const exists = await this.db.client.order.findUnique({
              where: { id: s.id },
              select: { id: true },
            });
            if (exists)
              await this.db.client.order.update({ where: { id: s.id }, data });
            else await this.db.client.order.create({ data });
          },
          list: async (q) => {
            const where: Prisma.OrderWhereInput = {
              ...(q.organizationId
                ? { organizationId: q.organizationId }
                : { buyerId: q.actorId }),
              ...(q.status ? { status: q.status } : {}),
            };
            const [rows, total] = await Promise.all([
              this.db.client.order.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
                take: q.limit,
                skip: (q.page - 1) * q.limit,
              }),
              this.db.client.order.count({ where }),
            ]);
            return {
              items: rows.map(M.order),
              total,
              page: q.page,
              limit: q.limit,
            };
          },
          audit: async (a) => {
            await this.db.client.orderAuditEntry.create({ data: a });
          },
          audits: async (orderId, page, limit) => {
            const where = { orderId };
            const [items, total] = await Promise.all([
              this.db.client.orderAuditEntry.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
                take: limit,
                skip: (page - 1) * limit,
              }),
              this.db.client.orderAuditEntry.count({ where }),
            ]);
            return { items, total, page, limit };
          },
          policyAudits: async (organizationId, page, limit) => {
            const where = { organizationId };
            const [rows, total] = await Promise.all([
              this.db.client.orderPolicyAuditEntry.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
                take: limit,
                skip: (page - 1) * limit,
              }),
              this.db.client.orderPolicyAuditEntry.count({ where }),
            ]);
            return {
              items: rows.map((r) => ({
                ...r,
                snapshot: r.snapshot as unknown as PolicyAudit['snapshot'],
              })),
              total,
              page,
              limit,
            };
          },
          due: async (now) =>
            (
              await this.db.client.order.findMany({
                where: { status: 'awaiting_payment', expiresAt: { lte: now } },
                orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
                select: { id: true },
                take: 100,
              })
            ).map((r) => r.id),
        }),
      )
      .catch((e) => {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        )
          throw new ApplicationError(
            'CONFLICT',
            'Quote or idempotency key was already used; retry the identical request.',
          );
        throw e;
      });
  }
}
