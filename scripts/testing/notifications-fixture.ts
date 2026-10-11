// Isolated metadata fixtures; never loaded by production API/worker builds.
import { randomUUID } from 'node:crypto';
import { Database } from '../../apps/api/src/shared/infrastructure/database';
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? 'http://invalid');
  if (
    process.env.NODE_ENV !== 'test' ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== '/pettly_test' ||
    !/^pettly-admin-test-\d+-\d+$/.test(process.env.REDIS_PREFIX ?? '')
  )
    throw Error('Requires isolated backoffice integration infrastructure.');
  const [action, id] = process.argv.slice(2);
  const db = new Database();
  try {
    if (action === 'seed') {
      const n = await db.client.inboxNotification.findUniqueOrThrow({
        where: { id },
      });
      const data = {
        notificationId: n.id,
        subjectType: n.subjectType,
        subjectId: n.subjectId,
        subjectVersion: n.subjectVersion,
        mailPurpose: 'business_notice',
        failedAt: new Date(),
        failureKind: 'delivery_failed',
        expiresAt: new Date(Date.now() + 3600000),
        attempts: 5,
      };
      const eligible = await db.client.outboxMessage.create({
        data: { ...data, id: randomUUID() },
      });
      const legacy = await db.client.outboxMessage.create({
        data: {
          id: randomUUID(),
          failedAt: new Date(),
          failureKind: 'delivery_failed',
          expiresAt: data.expiresAt,
        },
      });
      const superseded = await db.client.outboxMessage.create({
        data: { ...data, id: randomUUID(), failureKind: 'superseded' },
      });
      process.stdout.write(
        JSON.stringify({
          eligible: eligible.id,
          legacy: legacy.id,
          superseded: superseded.id,
        }),
      );
    } else if (action === 'status') {
      const child = await db.client.outboxMessage.findUnique({
          where: { retryOfId: id },
        }),
        audit = await db.client.notificationRetryAudit.findUnique({
          where: { failedOutboxId: id },
        });
      process.stdout.write(
        JSON.stringify({
          childId: child?.id ?? null,
          delivered: !!child?.deliveredAt,
          audited: !!audit,
          reason: audit?.reason ?? null,
        }),
      );
    } else throw Error('Unsupported fixture operation.');
  } finally {
    await db.onModuleDestroy();
  }
}
main().catch(() => {
  process.stderr.write('Isolated notification fixture failed.');
  process.exitCode = 1;
});
