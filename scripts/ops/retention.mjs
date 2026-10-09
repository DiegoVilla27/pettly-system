import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../../apps/api/package.json', import.meta.url),
);
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (!/^\/pettly_[a-z0-9_]+$/.test(url.pathname))
  throw Error('Retention requires an explicit Pettly database.');
const db = new PrismaClient(),
  apply = process.argv.includes('--apply');
const cutoff = new Date(Date.now() - 30 * 86400000),
  limit = 500;
try {
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('pettly:retention',0))::text`;
    const sessions = await tx.session.findMany({
      where: { expiresAt: { lt: cutoff } },
      select: { id: true },
      take: limit,
      orderBy: { expiresAt: 'asc' },
    });
    const tokens = await tx.actionToken.findMany({
      where: { expiresAt: { lt: cutoff } },
      select: { hash: true },
      take: limit,
      orderBy: { expiresAt: 'asc' },
    });
    const payloads = await tx.outboxMessage.findMany({
      where: {
        encryptedPayload: { not: null },
        OR: [
          { expiresAt: { lt: new Date() } },
          { deliveredAt: { not: null } },
          { failedAt: { not: null } },
        ],
      },
      select: { id: true },
      take: limit,
    });
    if (apply) {
      await tx.session.deleteMany({
        where: { id: { in: sessions.map((x) => x.id) } },
      });
      await tx.actionToken.deleteMany({
        where: { hash: { in: tokens.map((x) => x.hash) } },
      });
      await tx.outboxMessage.updateMany({
        where: { id: { in: payloads.map((x) => x.id) } },
        data: { encryptedPayload: null },
      });
    }
    return {
      mode: apply ? 'apply' : 'dry-run',
      limit,
      cutoff: cutoff.toISOString(),
      sessions: sessions.length,
      actionTokens: tokens.length,
      terminalCiphertexts: payloads.length,
    };
  });
  console.log(JSON.stringify(result));
} finally {
  await db.$disconnect();
}
