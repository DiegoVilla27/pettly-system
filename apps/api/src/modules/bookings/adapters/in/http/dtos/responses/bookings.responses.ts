import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { BOOKING_STATUSES } from '../../../../../domain/aggregates/booking';
const id = z.uuid(),
  date = z.iso.datetime(),
  integer = z.number().int();
const policy = z.strictObject({
  category: z.string().optional(),
  veterinaryCredentialId: z.uuid().nullable().optional(),
  name: z.string(),
  kind: z.enum(['appointment', 'lodging']),
  priceMinor: integer.positive(),
  currency: z.literal('COP'),
  collectionMode: z.literal('pay_at_business'),
  confirmationMode: z.enum(['automatic', 'manual']),
  durationMinutes: integer.nullable(),
  bufferBeforeMinutes: integer.nonnegative(),
  bufferAfterMinutes: integer.nonnegative(),
  checkInMinute: integer.nullable(),
  checkOutMinute: integer.nullable(),
  minNights: integer.positive(),
  maxNights: integer.positive(),
  minimumNoticeMinutes: integer.nonnegative(),
  cancellationCutoffMinutes: integer.nonnegative(),
  requestTtlMinutes: integer.positive(),
  requirements: z.string(),
  terms: z.string(),
  version: integer.positive(),
});
const slot = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('appointment'), startsAt: date }),
  z.strictObject({
    kind: z.literal('lodging'),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  }),
]);
const acceptance = z.strictObject({
  service: policy,
  resource: z.strictObject({
    id,
    name: z.string(),
    version: integer.positive(),
  }),
  organizationName: z.string(),
  pet: z.strictObject({ id, name: z.string(), species: z.string() }),
  contact: z.strictObject({ name: z.string(), phone: z.string() }),
  consent: z.literal(true),
  acceptedAt: date,
  timeZone: z.literal('America/Bogota'),
  totalMinor: integer.positive().max(Number.MAX_SAFE_INTEGER),
  nights: integer.positive().nullable(),
  slot,
});
const booking = z.strictObject({
  id,
  buyerId: id,
  animalId: id,
  serviceId: id,
  resourceId: id,
  organizationId: id,
  status: z.enum(BOOKING_STATUSES),
  version: integer.positive(),
  startsAt: date,
  endsAt: date,
  occupiedStartsAt: date,
  occupiedEndsAt: date,
  expiresAt: date.nullable(),
  acceptance,
  createdAt: date,
  updatedAt: date,
});
export class BookingResponseDto extends createZodDto(booking) {}
export class BookingsResponseDto extends createZodDto(
  z.strictObject({
    items: z.array(booking).max(50),
    total: integer.nonnegative(),
    page: integer.positive(),
    limit: integer.positive(),
  }),
) {}
export class BookingAuditResponseDto extends createZodDto(
  z.strictObject({
    items: z
      .array(
        z.strictObject({
          id,
          bookingId: id,
          actorId: id.nullable(),
          action: z.string(),
          version: integer.positive(),
          snapshot: z.record(z.string(), z.unknown()),
          reason: z.string(),
          requestId: z.string(),
          createdAt: date,
        }),
      )
      .max(50),
    total: integer.nonnegative(),
  }),
) {}
