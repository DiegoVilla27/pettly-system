import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from '../../../../../shared/infrastructure/database';
import type {
  BookingsRepository,
  BookingsWork,
} from '../../../application/ports/out/bookings-repository';
import { BookingsPersistenceMapper as M } from './bookings.mapper';
@Injectable()
export class PrismaBookingsRepository implements BookingsRepository {
  constructor(private readonly db: Database) {}
  run<T>(work: (tx: BookingsWork) => Promise<T>) {
    return this.db.transaction(() =>
      work({
        lock: (key) => this.db.lock(key),
        find: async (id) => {
          const r = await this.db.client.bookingRecord.findUnique({
            where: { id },
          });
          return r ? M.booking(r.snapshot) : null;
        },
        replay: async (buyerId, idempotencyKey) => {
          const r = await this.db.client.bookingRecord.findUnique({
            where: { buyerId_idempotencyKey: { buyerId, idempotencyKey } },
          });
          return r ? M.booking(r.snapshot) : null;
        },
        save: async (s) => {
          const { acceptance, ...indexed } = s;
          void acceptance;
          const data = { ...indexed, snapshot: M.json(s) };
          if (
            await this.db.client.bookingRecord.findUnique({
              where: { id: s.id },
              select: { id: true },
            })
          )
            await this.db.client.bookingRecord.update({
              where: { id: s.id },
              data,
            });
          else await this.db.client.bookingRecord.create({ data });
        },
        petOverlap: async (animalId, from, to, now, exclude) =>
          !!(await this.db.client.bookingRecord.findFirst({
            where: {
              animalId,
              ...(exclude ? { id: { not: exclude } } : {}),
              occupiedStartsAt: { lt: to },
              occupiedEndsAt: { gt: from },
              OR: [
                { status: { in: ['confirmed', 'in_progress', 'completed'] } },
                { status: 'requested', expiresAt: { gt: now } },
              ],
            },
            select: { id: true },
          })),
        audit: async (a) => {
          await this.db.client.bookingAuditEntry.create({
            data: { ...a, snapshot: M.json(a.snapshot) },
          });
        },
        audits: async (bookingId, page, limit) => {
          const where = { bookingId };
          const [items, total] = await Promise.all([
            this.db.client.bookingAuditEntry.findMany({
              where,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              skip: (page - 1) * limit,
              take: limit,
            }),
            this.db.client.bookingAuditEntry.count({ where }),
          ]);
          return { items, total };
        },
        list: async (q) => {
          const where: Prisma.BookingRecordWhereInput = {
            ...(q.organizationId
              ? { organizationId: q.organizationId }
              : { buyerId: q.actorId }),
            ...(q.status ? { status: q.status } : {}),
            ...(q.serviceId ? { serviceId: q.serviceId } : {}),
          };
          const [rows, total] = await Promise.all([
            this.db.client.bookingRecord.findMany({
              where,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              skip: (q.page - 1) * q.limit,
              take: q.limit,
            }),
            this.db.client.bookingRecord.count({ where }),
          ]);
          return { items: rows.map((r) => M.booking(r.snapshot)), total };
        },
        due: async (now, limit) =>
          (
            await this.db.client.bookingRecord.findMany({
              where: { status: 'requested', expiresAt: { lte: now } },
              orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
              take: limit,
            })
          ).map((r) => M.booking(r.snapshot)),
      }),
    );
  }
}
