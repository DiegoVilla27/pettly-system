import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  MailCipher,
  type TransactionalEmail,
} from '@pettly/notifications-runtime';
import { Database } from '../../../../../shared/infrastructure/database';
import type {
  NotificationsRepository,
  NotificationsWork,
  EmailJob,
} from '../../../application/ports/out/notifications-repository';
import { NotificationsPersistenceMapper as M } from './notifications.mapper';
@Injectable()
export class PrismaNotificationsRepository implements NotificationsRepository {
  private readonly cipher: MailCipher;
  private readonly deliverySelect = {
    id: true,
    notificationId: true,
    subjectType: true,
    subjectId: true,
    subjectVersion: true,
    mailPurpose: true,
    failureKind: true,
    expiresAt: true,
    notBefore: true,
    failedAt: true,
    deliveredAt: true,
    attempts: true,
    createdAt: true,
    retryOfId: true,
  } as const;
  constructor(
    private readonly db: Database,
    key: string,
  ) {
    this.cipher = new MailCipher(key);
  }
  private email(j: EmailJob): TransactionalEmail {
    const n = j.notification;
    if (j.purpose === 'business_notice')
      return {
        id: j.id,
        to: j.to,
        userId: n.userId,
        purpose: 'business_notice',
        category: n.category,
        title: n.title,
        body: n.body,
        expiresAt: j.expiresAt.toISOString(),
      };
    if (!n.details) throw new Error('Booking notice details are missing.');
    return {
      id: j.id,
      to: j.to,
      userId: n.userId,
      purpose: j.purpose,
      bookingId: n.subjectId,
      status: n.status,
      ...n.details,
      expiresAt: j.expiresAt.toISOString(),
    };
  }
  run<T>(work: (tx: NotificationsWork) => Promise<T>) {
    return this.db.transaction(() =>
      work({
        lock: (k) => this.db.lock(k),
        find: async (id) => {
          const r = await this.db.client.inboxNotification.findUnique({
            where: { id },
          });
          return r ? M.notification(r) : null;
        },
        event: async (userId, eventKey) => {
          const r = await this.db.client.inboxNotification.findUnique({
            where: { userId_eventKey: { userId, eventKey } },
          });
          return r ? M.notification(r) : null;
        },
        create: async (n) => {
          await this.db.client.inboxNotification.create({
            data: { ...n, details: M.json(n.details) },
          });
        },
        read: async (id, readAt) => {
          await this.db.client.inboxNotification.updateMany({
            where: { id, readAt: null },
            data: { readAt },
          });
        },
        readAll: async (userId, through, readAt) =>
          (
            await this.db.client.inboxNotification.updateMany({
              where: { userId, readAt: null, createdAt: { lte: through } },
              data: { readAt },
            })
          ).count,
        list: async (q) => {
          const where: Prisma.InboxNotificationWhereInput = {
            userId: q.actorId,
            ...(q.unreadOnly ? { readAt: null } : {}),
            ...(q.category ? { category: q.category } : {}),
          };
          const [rows, total] = await Promise.all([
            this.db.client.inboxNotification.findMany({
              where,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              skip: (q.page - 1) * q.limit,
              take: q.limit,
            }),
            this.db.client.inboxNotification.count({ where }),
          ]);
          return { items: rows.map(M.notification), total };
        },
        unread: (userId) =>
          this.db.client.inboxNotification.count({
            where: { userId, readAt: null },
          }),
        preferences: (userId) =>
          this.db.client.notificationPreference.findUnique({
            where: { userId },
          }),
        savePreferences: async (p) => {
          if (
            await this.db.client.notificationPreference.findUnique({
              where: { userId: p.userId },
              select: { userId: true },
            })
          )
            await this.db.client.notificationPreference.update({
              where: { userId: p.userId },
              data: p,
            });
          else await this.db.client.notificationPreference.create({ data: p });
        },
        cancelOptional: async (userId, categories, now) => {
          await this.db.client.outboxMessage.updateMany({
            where: {
              notification: { userId, category: { in: categories } },
              deliveredAt: null,
              failedAt: null,
            },
            data: {
              failedAt: now,
              failureKind: 'preferences_disabled',
              encryptedPayload: null,
              leaseUntil: null,
            },
          });
        },
        enqueue: async (j) => {
          await this.db.client.outboxMessage.create({
            data: {
              id: j.id,
              notificationId: j.notification.id,
              subjectType: j.notification.subjectType,
              subjectId: j.notification.subjectId,
              subjectVersion: j.notification.subjectVersion,
              mailPurpose: j.purpose,
              retryOfId: j.retryOfId,
              notBefore: j.notBefore,
              expiresAt: j.expiresAt,
              deduplicationKey: j.deduplicationKey,
              encryptedPayload: this.cipher.encrypt(this.email(j)),
              createdAt: j.retryOfId ? j.notBefore : j.notification.createdAt,
            },
          });
        },
        delivery: (id) =>
          this.db.client.outboxMessage.findUnique({
            where: { id },
            select: this.deliverySelect,
          }),
        child: (retryOfId) =>
          this.db.client.outboxMessage.findUnique({
            where: { retryOfId },
            select: this.deliverySelect,
          }),
        failed: async (page, limit) => {
          const where = { failedAt: { not: null }, deliveredAt: null };
          const [items, total] = await Promise.all([
            this.db.client.outboxMessage.findMany({
              where,
              select: this.deliverySelect,
              orderBy: [{ failedAt: 'desc' }, { id: 'asc' }],
              skip: (page - 1) * limit,
              take: limit,
            }),
            this.db.client.outboxMessage.count({ where }),
          ]);
          return { items, total };
        },
        retryAudit: async (a) => {
          await this.db.client.notificationRetryAudit.create({ data: a });
        },
      }),
    );
  }
}
