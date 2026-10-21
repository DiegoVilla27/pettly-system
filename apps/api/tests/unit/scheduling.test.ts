import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  availableCapacity,
  civilDate,
  fitsCalendar,
  localInstant,
  nextDay,
  peakUsage,
  validateWindows,
} from '../../src/shared/domain/scheduling';
import {
  Service,
  validateDetails,
  type ServiceDetails,
} from '../../src/modules/services/domain/aggregates/service';
import {
  Booking,
  bookingInterval,
  type BookingState,
} from '../../src/modules/bookings/domain/aggregates/booking';
import {
  CreateServiceDto,
  CreateResourceDto,
} from '../../src/modules/services/adapters/in/http/dtos/requests/services.requests';
import { CreateBookingDto } from '../../src/modules/bookings/adapters/in/http/dtos/requests/bookings.requests';
import { renderActionEmail } from '@pettly/notifications-runtime';
const now = new Date('2026-10-09T10:00:00Z');
const details = (): ServiceDetails => ({
  name: 'Dog grooming',
  description: 'Professional grooming for dogs.',
  category: 'grooming',
  kind: 'appointment',
  priceMinor: 3500000,
  currency: 'COP',
  acceptedSpecies: ['dog'],
  requirements: 'Bring vaccination record.',
  terms: 'Cancel at least one hour before the appointment.',
  collectionMode: 'pay_at_business',
  confirmationMode: 'automatic',
  durationMinutes: 60,
  bufferBeforeMinutes: 15,
  bufferAfterMinutes: 15,
  checkInMinute: null,
  checkOutMinute: null,
  minNights: 1,
  maxNights: 1,
  minimumNoticeMinutes: 60,
  cancellationCutoffMinutes: 60,
  requestTtlMinutes: 60,
  resourceIds: [randomUUID()],
});
const calendar = {
  kind: 'appointment' as const,
  windows: [{ day: 5, startMinute: 480, endMinute: 1080 }],
};
const interval = (a: string, b: string) => ({
  startsAt: new Date(a),
  endsAt: new Date(b),
});
test('half-open capacity uses concurrent peak, not all overlaps, and blocks consume every place', () => {
  const range = interval('2026-10-09T14:00Z', '2026-10-09T16:00Z');
  const busy = [
    interval('2026-10-09T13:00Z', '2026-10-09T15:00Z'),
    interval('2026-10-09T15:00Z', '2026-10-09T17:00Z'),
  ];
  assert.equal(peakUsage(busy), 1);
  assert.equal(availableCapacity(2, range, busy, []), 1);
  assert.equal(
    availableCapacity(2, range, busy, [
      interval('2026-10-09T15:30Z', '2026-10-09T18:00Z'),
    ]),
    0,
  );
  assert.equal(
    availableCapacity(
      1,
      range,
      [interval('2026-10-09T16:00Z', '2026-10-09T17:00Z')],
      [],
    ),
    1,
  );
});
test('Colombian civil calendar validates actual dates, boundary midnight and nonoverlapping windows', () => {
  assert.throws(() => civilDate('2026-02-30'));
  assert.equal(nextDay('2026-12-31'), '2027-01-01');
  assert.equal(
    localInstant('2026-10-09', 480).toISOString(),
    '2026-10-09T13:00:00.000Z',
  );
  assert.throws(() =>
    validateWindows('appointment', [
      { day: 1, startMinute: 480, endMinute: 600 },
      { day: 1, startMinute: 585, endMinute: 660 },
    ]),
  );
  assert.throws(() =>
    validateWindows('lodging', [{ day: 1, startMinute: 480, endMinute: 600 }]),
  );
  assert.equal(
    fitsCalendar(
      {
        kind: 'appointment',
        windows: [{ day: 5, startMinute: 1320, endMinute: 1440 }],
      },
      interval('2026-10-10T03:00Z', '2026-10-10T05:00Z'),
    ),
    true,
  );
  assert.equal(
    fitsCalendar(calendar, interval('2026-10-09T23:00Z', '2026-10-10T14:00Z')),
    false,
  );
});
test('appointment buffers, exact quarter hours and service notice determine occupied interval', () => {
  const d = details(),
    policy = { ...d, version: 1 };
  const s = bookingInterval(
    policy,
    { kind: 'appointment', startsAt: '2026-10-09T14:00:00Z' },
    calendar,
    now,
  );
  assert.equal(s.occupiedStartsAt.toISOString(), '2026-10-09T13:45:00.000Z');
  assert.equal(s.occupiedEndsAt.toISOString(), '2026-10-09T15:15:00.000Z');
  assert.equal(s.totalMinor, 3500000);
  assert.throws(() =>
    bookingInterval(
      policy,
      { kind: 'appointment', startsAt: '2026-10-09T13:00:00Z' },
      calendar,
      now,
    ),
  );
  assert.throws(() =>
    bookingInterval(
      policy,
      { kind: 'appointment', startsAt: '2026-10-09T14:01:00Z' },
      calendar,
      now,
    ),
  );
  assert.throws(() =>
    bookingInterval(
      policy,
      { kind: 'appointment', startsAt: '2026-10-09T10:15:00Z' },
      calendar,
      now,
    ),
  );
});
test('lodging charges nights and checks occupied nights without requiring checkout-day opening', () => {
  const d: ServiceDetails = {
    ...details(),
    category: 'lodging',
    kind: 'lodging',
    durationMinutes: null,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    checkInMinute: 900,
    checkOutMinute: 660,
    minNights: 1,
    maxNights: 7,
  };
  validateDetails(d);
  const c = {
    kind: 'lodging' as const,
    windows: [
      { day: 5, startMinute: 0, endMinute: 1440 },
      { day: 6, startMinute: 0, endMinute: 1440 },
    ],
  };
  const s = bookingInterval(
    { ...d, version: 1 },
    { kind: 'lodging', startDate: '2026-10-09', endDate: '2026-10-11' },
    c,
    now,
  );
  assert.equal(s.totalMinor, 7000000);
  assert.equal(s.nights, 2);
  assert.equal(s.startsAt.toISOString(), '2026-10-09T20:00:00.000Z');
  assert.equal(s.endsAt.toISOString(), '2026-10-11T16:00:00.000Z');
  assert.throws(() =>
    bookingInterval(
      { ...d, version: 1 },
      { kind: 'lodging', startDate: '2026-10-09', endDate: '2026-10-12' },
      c,
      now,
    ),
  );
  assert.throws(() => validateDetails({ ...d, checkOutMinute: 900 }));
});
test('service moderation forbids self-review and changes withdraw publication without mutating snapshots', () => {
  const actor = randomUUID(),
    s = Service.create(randomUUID(), randomUUID(), actor, details(), now);
  s.submit(now);
  assert.throws(() =>
    s.review(actor, true, 'Independent review completed.', now),
  );
  s.review(randomUUID(), true, 'Independent review completed.', now);
  const published = s.snapshot();
  s.configure({ ...details(), priceMinor: 4000000 }, now);
  assert.equal(s.snapshot().status, 'draft');
  assert.equal(published.priceMinor, 3500000);
  assert.throws(() => s.expect(1));
  s.close('archived', now);
  assert.throws(() => s.configure(details(), now));
});
function state(): BookingState {
  const d = details(),
    i = bookingInterval(
      { ...d, version: 3 },
      { kind: 'appointment', startsAt: '2026-10-09T14:00:00Z' },
      calendar,
      now,
    );
  const id = randomUUID(),
    resourceId = randomUUID(),
    animalId = randomUUID();
  return {
    id,
    buyerId: randomUUID(),
    animalId,
    serviceId: randomUUID(),
    resourceId,
    organizationId: randomUUID(),
    idempotencyKey: randomUUID(),
    fingerprint: 'a'.repeat(64),
    status: 'confirmed',
    version: 1,
    ...i,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
    acceptance: {
      service: { ...d, version: 3 },
      resource: { id: resourceId, name: 'Groomer', version: 1 },
      organizationName: 'Business',
      pet: { id: animalId, name: 'Dog', species: 'dog' },
      contact: { name: 'Customer', phone: '+573001234567' },
      consent: true,
      acceptedAt: now,
      timeZone: 'America/Bogota',
      totalMinor: i.totalMinor,
      nights: null,
      slot: { kind: 'appointment', startsAt: '2026-10-09T14:00:00Z' },
    },
  };
}
test('booking cancellation uses accepted cutoff, attendance uses service window and cleanup remains occupied', () => {
  const s = state();
  assert.throws(() =>
    Booking.restore(s).transition(
      'cancel',
      false,
      new Date('2026-10-09T13:00Z'),
    ),
  );
  const b = Booking.restore(s);
  b.transition('cancel', true, new Date('2026-10-09T13:30Z'));
  assert.equal(b.snapshot().status, 'cancelled');
  assert.throws(() => Booking.restore(s).transition('start', true, now));
  const attended = Booking.restore(s);
  attended.transition('start', true, new Date('2026-10-09T14:00Z'));
  attended.transition('complete', true, new Date('2026-10-09T14:30Z'));
  assert.equal(
    attended.snapshot().occupiedEndsAt.toISOString(),
    s.occupiedEndsAt.toISOString(),
  );
  assert.throws(() =>
    Booking.restore(s).transition(
      'no_show',
      true,
      new Date('2026-10-09T14:14Z'),
    ),
  );
});
test('manual deadline is terminal, clears expiry and cannot be confirmed after elapsed time', () => {
  const s = {
    ...state(),
    status: 'requested' as const,
    expiresAt: new Date(+now + 60000),
  };
  const b = Booking.restore(s);
  assert.equal(b.expire(new Date(+now + 60000)), true);
  assert.equal(b.snapshot().status, 'expired');
  assert.equal(b.snapshot().expiresAt, null);
  assert.equal(b.expire(new Date(+now + 120000)), false);
  assert.throws(() => b.transition('confirm', true, now));
});
test('strict request DTOs reject unsupported currency, veterinary category, injected status and malformed windows', () => {
  const d = {
    organizationId: randomUUID(),
    reason: 'Service conditions verified.',
    profile: details(),
  };
  assert.equal(CreateServiceDto.schema.safeParse(d).success, true);
  assert.equal(
    CreateServiceDto.schema.safeParse({ ...d, status: 'published' }).success,
    false,
  );
  assert.equal(
    CreateServiceDto.schema.safeParse({
      ...d,
      profile: { ...d.profile, currency: 'USD' },
    }).success,
    false,
  );
  assert.equal(
    CreateServiceDto.schema.safeParse({
      ...d,
      profile: { ...d.profile, category: 'veterinary' },
    }).success,
    false,
  );
  assert.equal(
    CreateResourceDto.schema.safeParse({
      organizationId: d.organizationId,
      reason: d.reason,
      profile: {
        name: 'Room',
        capacity: 2,
        status: 'active',
        kind: 'appointment',
        windows: [{ day: 1, startMinute: 7, endMinute: 600 }],
      },
    }).success,
    false,
  );
  assert.equal(
    CreateBookingDto.schema.safeParse({
      serviceId: randomUUID(),
      animalId: randomUUID(),
      resourceId: randomUUID(),
      idempotencyKey: randomUUID(),
      expectedServiceVersion: 1,
      expectedResourceVersion: 1,
      expectedTotalMinor: 1,
      contact: { name: 'Client', phone: '3001234567' },
      consent: true,
      slot: { kind: 'appointment', startsAt: '2026-10-09T14:00:00Z' },
    }).success,
    false,
  );
});
test('booking mail escapes provider text, contains Colombian times and does not claim online collection', () => {
  const mail = renderActionEmail(
    {
      id: randomUUID(),
      to: 'buyer@example.com',
      userId: randomUUID(),
      purpose: 'booking_reminder',
      bookingId: randomUUID(),
      serviceName: '<script>bad</script>',
      organizationName: 'Business & company',
      status: 'confirmed',
      startsAt: '2026-10-09T14:00:00Z',
      endsAt: '2026-10-09T15:00:00Z',
      totalMinor: 3500000,
      expiresAt: '2026-10-09T14:00:00Z',
    },
    'https://pettly.example',
  );
  assert.ok(mail.html.includes('&lt;script&gt;'));
  assert.ok(!mail.html.includes('<script>'));
  assert.ok(mail.html.includes('lang="es"'));
  assert.ok(mail.text.includes('Pettly no ha cobrado'));
  assert.ok(mail.text.includes('America/Bogota'));
});
