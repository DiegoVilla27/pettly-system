import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from '../../../../../shared/infrastructure/database';
import { ApplicationError } from '../../../../../shared/domain/application-error';
import type {
  PaymentsRepository,
  PaymentsWork,
} from '../../../application/ports/out/payments-repository';
import { PaymentsPersistenceMapper as M } from './payments.mapper';
@Injectable()
export class PrismaPaymentsRepository implements PaymentsRepository {
  constructor(private readonly db: Database) {}
  run<T>(work: (tx: PaymentsWork) => Promise<T>) {
    return this.db
      .transaction(() =>
        work({
          lock: (key) => this.db.lock(key),
          payment: async (id) => {
            const r = await this.db.client.paymentAttempt.findUnique({
              where: { id },
            });
            return r ? M.payment(r) : null;
          },
          replay: async (buyerId, idempotencyKey) => {
            const r = await this.db.client.paymentAttempt.findUnique({
              where: { buyerId_idempotencyKey: { buyerId, idempotencyKey } },
            });
            return r ? M.payment(r) : null;
          },
          active: async (orderId) => {
            const r = await this.db.client.paymentAttempt.findFirst({
              where: {
                orderId,
                status: { notIn: ['declined', 'cancelled', 'expired'] },
              },
              orderBy: { createdAt: 'desc' },
            });
            return r ? M.payment(r) : null;
          },
          save: async (s) => {
            const data = M.data(s);
            const exists = await this.db.client.paymentAttempt.findUnique({
              where: { id: s.id },
              select: { id: true },
            });
            if (exists)
              await this.db.client.paymentAttempt.update({
                where: { id: s.id },
                data,
              });
            else await this.db.client.paymentAttempt.create({ data });
          },
          audit: async (a) => {
            await this.db.client.paymentAuditEntry.create({ data: a });
          },
          history: async (paymentId, page, limit) => {
            const where = { paymentId };
            const [items, total] = await Promise.all([
              this.db.client.paymentAuditEntry.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
                skip: (page - 1) * limit,
                take: limit,
              }),
              this.db.client.paymentAuditEntry.count({ where }),
            ]);
            return { items, total, page, limit };
          },
          list: async (q) => {
            const where: Prisma.PaymentAttemptWhereInput = {
              ...(q.organizationId
                ? { organizationId: q.organizationId }
                : q.platform
                  ? {}
                  : { buyerId: q.actorId }),
              ...(q.status ? { status: q.status } : {}),
            };
            const [rows, total] = await Promise.all([
              this.db.client.paymentAttempt.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
                skip: (q.page - 1) * q.limit,
                take: q.limit,
              }),
              this.db.client.paymentAttempt.count({ where }),
            ]);
            return {
              items: rows.map(M.payment),
              total,
              page: q.page,
              limit: q.limit,
            };
          },
          event: async (provider, eventId) => {
            const r = await this.db.client.paymentProviderEvent.findUnique({
              where: { provider_eventId: { provider, eventId } },
            });
            return r ? M.event(r) : null;
          },
          saveEvent: async (e) => {
            await this.db.client.paymentProviderEvent.create({
              data: {
                ...e,
                observation: e.observation as unknown as Prisma.InputJsonValue,
              },
            });
          },
          capture: async (paymentId) => {
            const r = await this.db.client.paymentLedgerEntry.findUnique({
              where: { paymentId_kind: { paymentId, kind: 'capture' } },
            });
            return r ? M.ledger(r) : null;
          },
          saveLedger: async (l) => {
            await this.db.client.paymentLedgerEntry.create({
              data: {
                ...l,
                amountMinor: BigInt(l.amountMinor),
                platformMinor: BigInt(l.platformMinor),
                sellerMinor: BigInt(l.sellerMinor),
              },
            });
          },
          financials: async (paymentId) => {
            const [events, ledger] = await Promise.all([
              this.db.client.paymentProviderEvent.findMany({
                where: { paymentId },
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
                take: 100,
              }),
              this.db.client.paymentLedgerEntry.findMany({
                where: { paymentId },
                orderBy: { createdAt: 'asc' },
                take: 100,
              }),
            ]);
            return {
              events: events.map(M.event),
              ledger: ledger.map(M.ledger),
            };
          },
          job: async (id) => {
            const r = await this.db.client.paymentOutboxJob.findUnique({
              where: { id },
            });
            return r ? M.job(r) : null;
          },
          jobFor: async (paymentId, kind) => {
            const r = await this.db.client.paymentOutboxJob.findUnique({
              where: { paymentId_kind: { paymentId, kind } },
            });
            return r ? M.job(r) : null;
          },
          saveJob: async (j) => {
            await this.db.client.paymentOutboxJob.upsert({
              where: { id: j.id },
              create: j,
              update: j,
            });
          },
          due: async (now) =>
            (
              await this.db.client.paymentOutboxJob.findMany({
                where: {
                  status: { in: ['queued', 'retry'] },
                  nextAt: { lte: now },
                  OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
                },
                orderBy: [{ nextAt: 'asc' }, { id: 'asc' }],
                take: 20,
              })
            ).map(M.job),
        }),
      )
      .catch((e) => {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        )
          throw new ApplicationError(
            'CONFLICT',
            'Payment, provider reference or event was already recorded. Retry the identical request.',
          );
        throw e;
      });
  }
}
