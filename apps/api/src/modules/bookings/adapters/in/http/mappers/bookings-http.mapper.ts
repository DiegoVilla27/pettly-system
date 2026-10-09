import type { BookingState } from '../../../../application/results/booking';
export class BookingsHttpMapper {
  static booking(s: BookingState) {
    const { idempotencyKey, fingerprint, ...profile } = s;
    void idempotencyKey;
    void fingerprint;
    return {
      ...profile,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      occupiedStartsAt: s.occupiedStartsAt.toISOString(),
      occupiedEndsAt: s.occupiedEndsAt.toISOString(),
      expiresAt: s.expiresAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      acceptance: {
        ...s.acceptance,
        acceptedAt: s.acceptance.acceptedAt.toISOString(),
      },
    };
  }
}
