import {
  object,
  strictObject,
  string,
  number,
  int,
  refine,
  minLength,
  maxLength,
  regex,
  enum as enumeration,
  literal,
  nullable,
  optional,
  uuid,
  iso,
  array,
  discriminatedUnion,
} from 'zod/mini';
import type { ParamMap } from '@angular/router';
import type { ApiResponse } from '@pettly/api-client';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import type {
  Booking,
  BookingQuery,
  BookingContext,
  BookingAudit,
  Company,
} from '../models/booking';
const integer = (min: number, max: number) =>
  number().check(
    int(),
    refine((n) => n >= min && n <= max),
  );
export const version = integer(1, 2147483647);
const text = (min: number, max: number) =>
  string().check(minLength(min), maxLength(max), regex(/^[^\p{Cc}]+$/u));
const status = enumeration([
  'requested',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'rejected',
  'expired',
  'no_show',
]);
const policySchema = object({
  category: optional(text(1, 100)),
  veterinaryCredentialId: optional(nullable(uuid())),
  name: text(2, 150),
  kind: enumeration(['appointment', 'lodging']),
  priceMinor: integer(1, 2147483647),
  currency: literal('COP'),
  collectionMode: literal('pay_at_business'),
  confirmationMode: enumeration(['automatic', 'manual']),
  durationMinutes: nullable(integer(15, 480)),
  bufferBeforeMinutes: integer(0, 120),
  bufferAfterMinutes: integer(0, 120),
  checkInMinute: nullable(integer(0, 1439)),
  checkOutMinute: nullable(integer(0, 1439)),
  minNights: integer(1, 30),
  maxNights: integer(1, 30),
  minimumNoticeMinutes: integer(0, 43200),
  cancellationCutoffMinutes: integer(0, 43200),
  requestTtlMinutes: integer(15, 1440),
  requirements: text(2, 2000),
  terms: text(10, 2000),
  version,
});
const slotSchema = discriminatedUnion('kind', [
  object({ kind: literal('appointment'), startsAt: iso.datetime() }),
  object({
    kind: literal('lodging'),
    startDate: iso.date(),
    endDate: iso.date(),
  }),
]);
const acceptanceSchema = object({
  service: policySchema,
  resource: object({ id: uuid(), name: text(2, 100), version }),
  organizationName: text(2, 150),
  pet: object({ id: uuid(), name: text(1, 100), species: text(1, 40) }),
  contact: object({
    name: text(2, 100),
    phone: string().check(regex(/^[+][1-9][0-9]{7,14}$/)),
  }),
  consent: literal(true),
  acceptedAt: iso.datetime(),
  timeZone: literal('America/Bogota'),
  totalMinor: integer(1, 64424509410),
  nights: nullable(integer(1, 30)),
  slot: slotSchema,
});
export const bookingSchema = object({
  id: uuid(),
  buyerId: uuid(),
  animalId: uuid(),
  serviceId: uuid(),
  resourceId: uuid(),
  organizationId: uuid(),
  status,
  version,
  startsAt: iso.datetime(),
  endsAt: iso.datetime(),
  occupiedStartsAt: iso.datetime(),
  occupiedEndsAt: iso.datetime(),
  expiresAt: nullable(iso.datetime()),
  acceptance: acceptanceSchema,
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
}).check(refine(validBooking));
function validBooking(b: Booking): boolean {
  const a = b.acceptance,
    s = a.service;
  if (
    a.pet.id !== b.animalId ||
    a.resource.id !== b.resourceId ||
    s.kind !== a.slot.kind ||
    Date.parse(b.endsAt) <= Date.parse(b.startsAt) ||
    Date.parse(b.createdAt) > Date.parse(b.updatedAt) ||
    Date.parse(a.acceptedAt) > Date.parse(b.updatedAt) ||
    Date.parse(b.occupiedStartsAt) !==
      Date.parse(b.startsAt) - s.bufferBeforeMinutes * 60000 ||
    Date.parse(b.occupiedEndsAt) !==
      Date.parse(b.endsAt) + s.bufferAfterMinutes * 60000 ||
    (b.status === 'requested') !== (b.expiresAt !== null) ||
    (b.expiresAt && Date.parse(b.expiresAt) > Date.parse(b.startsAt))
  )
    return false;
  if (a.slot.kind === 'appointment')
    return (
      a.nights === null &&
      s.durationMinutes !== null &&
      Date.parse(a.slot.startsAt) === Date.parse(b.startsAt) &&
      Date.parse(b.endsAt) - Date.parse(b.startsAt) ===
        s.durationMinutes * 60000 &&
      a.totalMinor === s.priceMinor
    );
  const nights =
    (Date.parse(a.slot.endDate) - Date.parse(a.slot.startDate)) / 86400000;
  return (
    a.nights === nights &&
    nights >= s.minNights &&
    nights <= s.maxNights &&
    a.totalMinor === s.priceMinor * nights &&
    s.durationMinutes === null &&
    s.checkInMinute !== null &&
    s.checkOutMinute !== null &&
    Date.parse(b.startsAt) ===
      Date.parse(a.slot.startDate + 'T00:00:00-05:00') +
        s.checkInMinute * 60000 &&
    Date.parse(b.endsAt) ===
      Date.parse(a.slot.endDate + 'T00:00:00-05:00') + s.checkOutMinute * 60000
  );
}
export const contextSchema = strictObject({
  organizationId: uuid(),
  bookingId: uuid(),
});
export const querySchema = strictObject({
  organizationId: uuid(),
  page: integer(1, 10000),
  limit: integer(1, 50),
  status: optional(status),
  serviceId: optional(uuid()),
  search: optional(text(2, 100)),
});
export const decisionSchema = strictObject({
  expectedVersion: version,
  reason: reasonSchema,
});
export function inputProblem() {
  return new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa los filtros, la acción y el motivo de la reserva.',
  );
}
export function contractProblem() {
  return new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar la información de la reserva. Actualiza antes de continuar.',
  );
}
export function mapBooking(dto: unknown, context?: BookingContext): Booking {
  const p = bookingSchema.safeParse(dto);
  if (
    !p.success ||
    (context &&
      (p.data.id !== context.bookingId ||
        p.data.organizationId !== context.organizationId))
  )
    throw contractProblem();
  return p.data;
}
export function mapPage(
  dto: ApiResponse<'listManagedBookings'>,
  q: BookingQuery,
) {
  const p = object({
    items: array(bookingSchema).check(maxLength(50)),
    total: integer(0, Number.MAX_SAFE_INTEGER),
    page: integer(1, 10000),
    limit: integer(1, 50),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.page !== q.page ||
    p.data.limit !== q.limit ||
    p.data.items.length > q.limit ||
    p.data.total < p.data.items.length ||
    new Set(p.data.items.map((b) => b.id)).size !== p.data.items.length ||
    p.data.items.some(
      (b) =>
        b.organizationId !== q.organizationId ||
        (q.status && b.status !== q.status) ||
        (q.serviceId && b.serviceId !== q.serviceId),
    )
  )
    throw contractProblem();
  return p.data;
}
export function mapAudit(
  dto: ApiResponse<'listManagedBookingAudit'>,
  c: BookingContext,
): { items: BookingAudit[]; total: number } {
  const p = object({
    items: array(
      object({
        id: uuid(),
        bookingId: uuid(),
        actorId: nullable(uuid()),
        action: text(1, 50),
        version,
        snapshot: bookingSchema,
        reason: reasonSchema,
        requestId: text(1, 100),
        createdAt: iso.datetime(),
      }),
    ).check(maxLength(20)),
    total: integer(0, Number.MAX_SAFE_INTEGER),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.total < p.data.items.length ||
    new Set(p.data.items.map((a) => a.id)).size !== p.data.items.length ||
    p.data.items.some(
      (a) =>
        a.bookingId !== c.bookingId ||
        a.snapshot.id !== c.bookingId ||
        a.snapshot.organizationId !== c.organizationId ||
        a.snapshot.version !== a.version,
    )
  )
    throw contractProblem();
  return p.data;
}
export function mapCompany(
  dto: ApiResponse<'listOrganizations'>['items'][number],
): Company {
  const p = object({
    id: uuid(),
    name: text(2, 150),
    type: literal('business'),
    status: literal('active'),
  }).safeParse(dto);
  if (!p.success) throw contractProblem();
  return { id: p.data.id, name: p.data.name };
}
export function parseFilters(params: ParamMap): BookingQuery | null {
  const p = querySchema.safeParse({
    organizationId: params.get('organizationId') ?? '',
    page: Number(params.get('page') ?? 1),
    limit: Number(params.get('limit') ?? 20),
    status: params.get('status') || undefined,
    serviceId: params.get('serviceId') || undefined,
    search: params.get('search') || undefined,
  });
  return p.success ? p.data : null;
}
