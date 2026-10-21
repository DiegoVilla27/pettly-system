import { Injectable } from '@nestjs/common';
import { Database } from '../../../../shared/infrastructure/database';
import type { RuntimeConfig } from '../../../../shared/infrastructure/config';
import type { Entropy } from '../../../../shared/application/runtime-ports';
import type {
  BookingNotifications,
  BookingNotice,
} from '../../application/ports/in/booking-notifications';
import type { BusinessNotifications } from '../../application/ports/in/business-notifications';
@Injectable()
export class BookingMailOutbox implements BookingNotifications {
  constructor(
    private readonly db: Database,
    _settings: RuntimeConfig,
    _entropy: Entropy,
    private readonly publisher: BusinessNotifications,
  ) {}
  async cancel(bookingId: string) {
    await this.db.client.outboxMessage.updateMany({
      where: {
        subjectId: bookingId,
        subjectType: 'booking',
        deliveredAt: null,
      },
      data: {
        failedAt: new Date(),
        failureKind: 'superseded',
        encryptedPayload: null,
        leaseUntil: null,
      },
    });
  }
  async replace(n: BookingNotice) {
    await this.db.client.outboxMessage.updateMany({
      where: {
        subjectId: n.bookingId,
        subjectType: 'booking',
        subjectVersion: { lt: n.version },
        deliveredAt: null,
      },
      data: {
        failedAt: n.now,
        failureKind: 'superseded',
        encryptedPayload: null,
        leaseUntil: null,
      },
    });
    await this.publisher.publish({
      eventKey: `booking:${n.bookingId}:${n.version}`,
      category: 'bookings',
      eventType: 'booking.updated',
      subjectType: 'booking',
      subjectId: n.bookingId,
      subjectVersion: n.version,
      status: n.status,
      recipientIds: [n.userId],
      booking: {
        serviceName: n.serviceName,
        organizationName: n.organizationName,
        startsAt: n.startsAt.toISOString(),
        endsAt: n.endsAt.toISOString(),
        totalMinor: n.totalMinor,
      },
      now: n.now,
    });
  }
}
