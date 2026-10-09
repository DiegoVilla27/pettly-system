import { NotificationsHandlers } from '../../apps/api/src/modules/notifications/application/handlers/notifications.handlers';
import { PrismaNotificationsRepository } from '../../apps/api/src/modules/notifications/adapters/out/persistence/prisma-notifications-repository';
/** Trusted clock helper, isolated integration database only; never included in runtime builds. */
import 'reflect-metadata';
import { randomUUID, createHash } from 'node:crypto';
import { Database } from '../../apps/api/src/shared/infrastructure/database';
import { BookingActionCommand } from '../../apps/api/src/modules/bookings/application/commands/booking.commands';
import { BookingsHandlers } from '../../apps/api/src/modules/bookings/application/handlers/bookings.handlers';
import { PrismaBookingsRepository } from '../../apps/api/src/modules/bookings/adapters/out/persistence/prisma-bookings-repository';
import { PrismaBookingOccupancy } from '../../apps/api/src/modules/bookings/adapters/out/persistence/prisma-booking-occupancy';
import { BookingMailOutbox } from '../../apps/api/src/modules/notifications/adapters/out/booking-mail-outbox';
import { config } from '../../apps/api/src/shared/infrastructure/config';
import type { Authorization } from '../../apps/api/src/modules/authorization/application/ports/in/authorization';
import type { ServicesBooking } from '../../apps/api/src/modules/services/application/ports/in/services-booking';
import type { AnimalsBooking } from '../../apps/api/src/modules/animals/application/ports/in/animals-booking';
import type { UsersDirectory } from '../../apps/api/src/modules/users/application/ports/out/users-directory';
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? 'http://invalid');
  if (
    process.env.NODE_ENV !== 'test' ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== '/pettly_test'
  )
    throw new Error('This helper requires the isolated integration database.');
  const [action, id, time, actorId] = process.argv.slice(2);
  if (
    !['expire', 'start', 'complete', 'no_show'].includes(action) ||
    !Number.isFinite(Date.parse(time))
  )
    throw new Error('Unsupported integration operation.');
  const db = new Database(),
    entropy = {
      id: randomUUID,
      token: randomUUID,
      digest: (v: string) => createHash('sha256').update(v).digest('hex'),
    };
  const unused = () => {
    throw new Error('Unexpected integration port invocation.');
  };
  const users = {
    findById: (id: string) => db.client.user.findUnique({ where: { id } }),
  } as unknown as UsersDirectory;
  const handlers = new BookingsHandlers(
    new PrismaBookingsRepository(db),
    { requirePermission: async () => undefined } as unknown as Authorization,
    { offer: unused } as unknown as ServicesBooking,
    { forBooking: unused } as AnimalsBooking,
    users,
    new PrismaBookingOccupancy(db),
    new BookingMailOutbox(
      db,
      config(),
      entropy,
      new NotificationsHandlers(
        new PrismaNotificationsRepository(db, config().mailKey),
        users,
        { now: () => new Date(time) },
        entropy,
      ),
    ),
    { now: () => new Date(time) },
    entropy,
  );
  try {
    if (action === 'expire') await handlers.expireDue();
    else {
      const current = await db.client.bookingRecord.findUniqueOrThrow({
        where: { id },
      });
      if (!actorId) throw new Error('Actor required.');
      await handlers.action(
        new BookingActionCommand(
          actorId,
          id,
          current.version,
          action as 'start' | 'complete' | 'no_show',
          'Isolated integration attendance verified.',
          'booking-isolated-clock',
          true,
        ),
      );
    }
    const row = await db.client.bookingRecord.findUniqueOrThrow({
      where: { id },
    });
    process.stdout.write(JSON.stringify({ id: row.id, status: row.status }));
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch(() => {
  process.stderr.write('Isolated booking helper failed.\n');
  process.exitCode = 1;
});
