import { convertToParamMap } from '@angular/router';
import { booking } from '../testing/booking.fixture';
import { mapBooking, mapPage, mapAudit, parseFilters } from './bookings.mapper';
describe('Accepted booking contracts and private scope', () => {
  it('validates immutable price, identity, buffers and interval consistency', () => {
    expect(mapBooking(booking)).toEqual(booking);
    for (const b of [
      { ...booking, animalId: booking.buyerId },
      { ...booking, occupiedEndsAt: booking.endsAt },
      { ...booking, acceptance: { ...booking.acceptance, totalMinor: 1 } },
      { ...booking, status: 'confirmed' },
    ])
      expect(() => mapBooking(b)).toThrow();
    expect(() =>
      mapBooking(booking, {
        organizationId: booking.buyerId,
        bookingId: booking.id,
      }),
    ).toThrow();
  });
  it('keeps legacy accepted policies readable and strips implementation keys from audit views', () => {
    const snapshot = {
      ...booking,
      idempotencyKey: crypto.randomUUID(),
      fingerprint: 'private technical hash',
    };
    const result = mapAudit(
      {
        items: [
          {
            id: booking.serviceId,
            bookingId: booking.id,
            actorId: null,
            action: 'expired',
            version: 1,
            reason: 'Pending business confirmation deadline elapsed.',
            requestId: 'booking-expiry-read',
            createdAt: booking.updatedAt,
            snapshot,
          },
        ],
        total: 1,
      },
      { organizationId: booking.organizationId, bookingId: booking.id },
    );
    expect(result.items[0]?.snapshot).toEqual(booking);
    expect(result.items[0]?.snapshot).not.toHaveProperty('fingerprint');
  });
  it('validates nightly totals and Colombia lodging instants', () => {
    const b = {
      ...booking,
      status: 'confirmed' as const,
      expiresAt: null,
      startsAt: '2026-10-12T20:00:00.000Z',
      endsAt: '2026-10-14T17:00:00.000Z',
      occupiedStartsAt: '2026-10-12T20:00:00.000Z',
      occupiedEndsAt: '2026-10-14T17:00:00.000Z',
      acceptance: {
        ...booking.acceptance,
        nights: 2,
        totalMinor: 2000100,
        slot: {
          kind: 'lodging' as const,
          startDate: '2026-10-12',
          endDate: '2026-10-14',
        },
        service: {
          ...booking.acceptance.service,
          kind: 'lodging' as const,
          durationMinutes: null,
          bufferAfterMinutes: 0,
          checkInMinute: 900,
          checkOutMinute: 720,
          maxNights: 7,
        },
      },
    };
    expect(mapBooking(b).acceptance.nights).toBe(2);
    expect(() =>
      mapBooking({ ...b, endsAt: '2026-10-14T16:00:00.000Z' }),
    ).toThrow();
  });
  it('rejects injected filters and cross-company or mismatched pages', () => {
    const q = { organizationId: booking.organizationId, page: 1, limit: 20 };
    expect(
      parseFilters(convertToParamMap({ ...q, search: 'Toby' }))?.search,
    ).toBe('Toby');
    expect(parseFilters(convertToParamMap({ ...q, page: '0' }))).toBeNull();
    expect(() =>
      mapPage(
        { items: [booking], total: 1, page: 1, limit: 20 },
        { ...q, organizationId: booking.id },
      ),
    ).toThrow();
  });
});
