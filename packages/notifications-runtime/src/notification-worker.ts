import { writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { config } from './config';
import { MailCipher } from './mail-cipher';
import { SmtpMailTransport, renderActionEmail } from './smtp-mail';
import type { TransactionalEmail } from './mail';
export async function startNotificationWorker() {
  const settings = config(),
    db = new PrismaClient(),
    cipher = new MailCipher(settings.mailKey),
    mail = new SmtpMailTransport(settings);
  await db.$connect();
  const url = new URL(settings.redisUrl),
    connection = {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: decodeURIComponent(url.password) || undefined,
      db: Number(url.pathname.slice(1) || 0),
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
      maxRetriesPerRequest: null,
    };
  const queue = new Queue('transactional-mail', {
    connection,
    prefix: settings.redisPrefix,
  });
  const worker = new Worker<{ outboxId: string }>(
    'transactional-mail',
    async (job) => {
      const row = await db.outboxMessage.findUnique({
        where: { id: job.data.outboxId },
      });
      if (!row || row.deliveredAt || row.failedAt || !row.encryptedPayload)
        return;
      if (row.notBefore > new Date()) return;
      if (row.expiresAt <= new Date()) {
        await db.outboxMessage.update({
          where: { id: row.id },
          data: {
            failedAt: new Date(),
            failureKind: 'expired',
            encryptedPayload: null,
          },
        });
        return;
      }
      const email = cipher.decrypt<TransactionalEmail>(row.encryptedPayload);
      const category =
        email.purpose === 'business_notice'
          ? email.category
          : 'bookingId' in email
            ? 'bookings'
            : null;
      if (category && category !== 'organizations' && email.userId) {
        const p = await db.notificationPreference.findUnique({
          where: { userId: email.userId },
        });
        const enabled =
          category === 'orders'
            ? p?.ordersEmail
            : category === 'adoptions'
              ? p?.adoptionsEmail
              : p?.bookingsEmail;
        if (enabled === false) {
          await db.outboxMessage.update({
            where: { id: row.id },
            data: {
              failedAt: new Date(),
              failureKind: 'preferences_disabled',
              encryptedPayload: null,
              leaseUntil: null,
            },
          });
          return;
        }
      }
      await db.outboxMessage.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      await mail.send(renderActionEmail(email, settings.webUrl));
      await db.outboxMessage.update({
        where: { id: row.id },
        data: {
          deliveredAt: new Date(),
          encryptedPayload: null,
          leaseUntil: null,
        },
      });
    },
    { connection, prefix: settings.redisPrefix, concurrency: 3 },
  );
  worker.on('failed', (job) => {
    if (job && job.attemptsMade >= Number(job.opts.attempts || 5))
      void db.outboxMessage
        .updateMany({
          where: { id: job.data.outboxId, deliveredAt: null, failedAt: null },
          data: {
            failedAt: new Date(),
            failureKind: 'delivery_failed',
            encryptedPayload: null,
          },
        })
        .catch(() => undefined);
    process.stderr.write(
      JSON.stringify({
        level: 'error',
        event: 'mail_delivery_failed',
        jobId: job?.id,
      }) + '\n',
    );
  });
  worker.on('error', () =>
    process.stderr.write(
      JSON.stringify({
        level: 'error',
        event: 'mail_worker_dependency_error',
      }) + '\n',
    ),
  );
  queue.on('error', () => undefined);
  let busy = false;
  const dispatch = async () => {
    if (busy) return;
    busy = true;
    try {
      await db.outboxMessage.updateMany({
        where: {
          deliveredAt: null,
          failedAt: null,
          expiresAt: { lte: new Date() },
        },
        data: {
          failedAt: new Date(),
          failureKind: 'expired',
          encryptedPayload: null,
        },
      });
      const rows = await db.$queryRaw<
        { id: string }[]
      >`WITH candidates AS (SELECT id FROM notification_outbox WHERE "deliveredAt" IS NULL AND "failedAt" IS NULL AND "expiresAt" > NOW() AND "notBefore" <= NOW() AND ("enqueuedAt" IS NULL OR "enqueuedAt" < NOW() - INTERVAL '60 seconds') AND ("leaseUntil" IS NULL OR "leaseUntil" < NOW()) ORDER BY "createdAt" LIMIT 50 FOR UPDATE SKIP LOCKED) UPDATE notification_outbox AS o SET "leaseUntil" = NOW() + INTERVAL '30 seconds' FROM candidates AS c WHERE o.id=c.id RETURNING o.id`;
      for (const row of rows) {
        await queue.add(
          'send-action-email',
          { outboxId: row.id },
          {
            jobId: row.id,
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 1000,
            removeOnFail: 1000,
          },
        );
        await db.outboxMessage.update({
          where: { id: row.id },
          data: { enqueuedAt: new Date(), leaseUntil: null },
        });
      }
    } catch {
      process.stderr.write(
        JSON.stringify({
          level: 'error',
          event: 'outbox_dispatch_dependency_error',
        }) + '\n',
      );
    } finally {
      busy = false;
    }
  };
  const heartbeat = async () => {
    try {
      await (
        await queue.getBackend().connection.client
      ).set(settings.redisPrefix + ':worker:heartbeat', String(Date.now()), {
        EX: 45,
      });
      await writeFile('/tmp/pettly-worker-heartbeat', String(Date.now()), {
        mode: 0o600,
      });
    } catch {
      process.stderr.write(
        JSON.stringify({ level: 'error', event: 'worker_heartbeat_failed' }) +
          '\n',
      );
    }
  };
  const heartbeatTimer = setInterval(() => void heartbeat(), 15000);
  await heartbeat();
  const timer = setInterval(() => void dispatch(), 1000);
  await dispatch();
  return async () => {
    clearInterval(timer);
    clearInterval(heartbeatTimer);
    await worker.close();
    await queue.close();
    mail.close();
    await db.$disconnect();
  };
}
