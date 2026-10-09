import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { BOOKING_STATUSES } from '../../../../../domain/aggregates/booking';
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^[^\p{Cc}]+$/u);
const version = z.number().int().min(1).max(2147483647),
  reason = text(10, 500);
const selection = {
  resourceId: z.uuid(),
  expectedServiceVersion: version,
  expectedResourceVersion: version,
  expectedTotalMinor: z.number().int().positive().max(64424509410),
  slot: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('appointment'),
      startsAt: z.iso
        .datetime()
        .meta({ description: 'UTC ISO timestamp, exact quarter-hour.' }),
    }),
    z.strictObject({
      kind: z.literal('lodging'),
      startDate: z.iso.date(),
      endDate: z.iso.date(),
    }),
  ]),
  contact: z.strictObject({
    name: text(2, 100),
    phone: z.string().regex(/^[+][1-9][0-9]{7,14}$/),
  }),
  consent: z.literal(true).meta({
    description:
      'Explicit acceptance of the displayed service terms, price, cancellation policy and sharing contact/pet identity with the chosen provider.',
  }),
};
export class CreateBookingDto extends createZodDto(
  z.strictObject({
    ...selection,
    serviceId: z.uuid(),
    animalId: z.uuid(),
    idempotencyKey: z.uuid(),
  }),
) {}
export class RescheduleBookingDto extends createZodDto(
  z.strictObject({ ...selection, expectedVersion: version, reason }),
) {}
export class BookingDecisionDto extends createZodDto(
  z.strictObject({ expectedVersion: version, reason }),
) {}
export class BookingParamsDto extends createZodDto(
  z.strictObject({ bookingId: z.uuid() }),
) {}
export class BookingsPageDto extends createZodDto(
  z.strictObject({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
) {}
const filters = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(BOOKING_STATUSES).optional(),
  serviceId: z.uuid().optional(),
};
export class OwnBookingsQueryDto extends createZodDto(
  z.strictObject(filters),
) {}
export class ManagedBookingsQueryDto extends createZodDto(
  z.strictObject({ ...filters, organizationId: z.uuid() }),
) {}
