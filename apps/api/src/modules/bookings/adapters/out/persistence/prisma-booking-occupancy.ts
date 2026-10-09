import { Injectable } from '@nestjs/common';
import { Database } from '../../../../../shared/infrastructure/database';
import type { BookingOccupancy } from '../../../application/ports/in/booking-occupancy';
@Injectable()
export class PrismaBookingOccupancy implements BookingOccupancy {
  constructor(private readonly db: Database) {}
  async range(resourceId: string, from: Date, to: Date, now: Date) {
    const rows = await this.db.client.bookingRecord.findMany({
      where: {
        resourceId,
        occupiedStartsAt: { lt: to },
        occupiedEndsAt: { gt: from },
        OR: [
          { status: { in: ['confirmed', 'in_progress', 'completed'] } },
          { status: 'requested', expiresAt: { gt: now } },
        ],
      },
      select: { id: true, occupiedStartsAt: true, occupiedEndsAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      startsAt: r.occupiedStartsAt,
      endsAt: r.occupiedEndsAt,
    }));
  }
}
