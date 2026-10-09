import { Prisma } from '@prisma/client';
import type { BookingState } from '../../../application/results/booking';
export class BookingsPersistenceMapper {
  static json(s: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(s)) as Prisma.InputJsonValue;
  }
  static booking(snapshot: Prisma.JsonValue): BookingState {
    const s = snapshot as unknown as BookingState;
    return {
      ...s,
      startsAt: new Date(s.startsAt),
      endsAt: new Date(s.endsAt),
      occupiedStartsAt: new Date(s.occupiedStartsAt),
      occupiedEndsAt: new Date(s.occupiedEndsAt),
      expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      acceptance: {
        ...s.acceptance,
        acceptedAt: new Date(s.acceptance.acceptedAt),
      },
    };
  }
}
