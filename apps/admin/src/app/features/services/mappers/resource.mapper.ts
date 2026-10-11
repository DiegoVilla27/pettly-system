import {
  object,
  strictObject,
  string,
  uuid,
  number,
  int,
  refine,
  array,
  nullable,
  iso,
  literal,
  enum as enumeration,
  maxLength,
  minLength,
  regex,
  record,
  unknown,
  boolean,
} from 'zod/mini';
import type { ApiResponse } from '@pettly/api-client';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import {
  version,
  inputProblem,
  contractProblem,
  mapResources,
} from './services.mapper';
import type { Resource, Service } from '../models/service';
import type {
  ResourceProfile,
  Block,
  ResourceAudit,
  Availability,
  AvailabilityQuery,
} from '../models/resource';
const integer = (min: number, max: number) =>
  number().check(
    int(),
    refine((n) => n >= min && n <= max),
  );
const windowSchema = strictObject({
  day: integer(1, 7),
  startMinute: integer(0, 1439),
  endMinute: integer(1, 1440),
});
export const resourceProfileSchema = strictObject({
  name: string().check(minLength(2), maxLength(100), regex(/^[^\p{Cc}]+$/u)),
  kind: enumeration(['appointment', 'lodging']),
  capacity: integer(1, 100),
  status: enumeration(['active', 'inactive']),
  windows: array(windowSchema).check(minLength(1), maxLength(21)),
}).check(refine(validWindows));
export function validWindows(p: ResourceProfile): boolean {
  if (
    p.windows.some(
      (w) =>
        w.startMinute >= w.endMinute ||
        w.startMinute % 15 !== 0 ||
        w.endMinute % 15 !== 0 ||
        (p.kind === 'lodging' && (w.startMinute !== 0 || w.endMinute !== 1440)),
    )
  )
    return false;
  const sorted = [...p.windows].sort(
    (a, b) => a.day - b.day || a.startMinute - b.startMinute,
  );
  return sorted.every(
    (w, i) =>
      i === 0 ||
      sorted[i - 1]?.day !== w.day ||
      (sorted[i - 1]?.endMinute ?? 1441) <= w.startMinute,
  );
}
export const resourceCreateSchema = strictObject({
  organizationId: uuid(),
  profile: resourceProfileSchema,
  reason: reasonSchema,
});
export const resourceUpdateSchema = strictObject({
  ...resourceCreateSchema.shape,
  expectedVersion: version,
});
export const releaseSchema = strictObject({
  expectedVersion: version,
  reason: reasonSchema,
});
export const blockSchema = strictObject({
  ...releaseSchema.shape,
  startsAt: iso.datetime(),
  endsAt: iso.datetime(),
}).check(refine((b) => validBlockRange(b.startsAt, b.endsAt)));
export function validBlockRange(from: string, to: string, now = Date.now()) {
  return (
    Date.parse(from) > now &&
    Date.parse(to) > Date.parse(from) &&
    Date.parse(to) <= now + 210 * 86400000
  );
}
export const blockResponseSchema = object({
  id: uuid(),
  organizationId: uuid(),
  resourceId: uuid(),
  startsAt: iso.datetime(),
  endsAt: iso.datetime(),
  reason: reasonSchema,
  createdBy: uuid(),
  createdAt: iso.datetime(),
  releasedAt: nullable(iso.datetime()),
}).check(refine((b) => Date.parse(b.endsAt) > Date.parse(b.startsAt)));
export function mapBlock(
  dto: Block,
  organizationId: string,
  resourceId: string,
  id?: string,
): Block {
  const p = blockResponseSchema.safeParse(dto);
  if (
    !p.success ||
    p.data.organizationId !== organizationId ||
    p.data.resourceId !== resourceId ||
    (id && p.data.id !== id)
  )
    throw contractProblem();
  return p.data;
}
export function mapResource(
  dto: Resource,
  organizationId: string,
  id?: string,
): Resource {
  const r = mapResources({ items: [dto] }, organizationId)[0];
  if (
    !r ||
    !resourceProfileSchema.safeParse({
      name: r.name,
      kind: r.kind,
      capacity: r.capacity,
      status: r.status,
      windows: r.windows,
    }).success ||
    (id && r.id !== id)
  )
    throw contractProblem();
  return r;
}
const resourceAuditSchema = object({
  id: uuid(),
  organizationId: uuid(),
  serviceId: literal(null),
  resourceId: uuid(),
  actorId: uuid(),
  action: enumeration([
    'resource_created',
    'resource_updated',
    'resource_blocked',
    'block_released',
  ]),
  version,
  snapshot: record(string(), unknown()),
  reason: reasonSchema,
  requestId: uuid(),
  createdAt: iso.datetime(),
});
export function mapResourceAudit(
  dto: ApiResponse<'listServiceResourceAudit'>,
  organizationId: string,
  resourceId: string,
): { items: ResourceAudit[]; total: number } {
  const p = object({
    items: array(resourceAuditSchema).check(maxLength(20)),
    total: integer(0, Number.MAX_SAFE_INTEGER),
  }).safeParse(dto);
  if (
    !p.success ||
    new Set(p.data.items.map((a) => a.id)).size !== p.data.items.length
  )
    throw contractProblem();
  for (const a of p.data.items) {
    if (
      a.organizationId !== organizationId ||
      a.resourceId !== resourceId ||
      a.snapshot['id'] !== resourceId ||
      a.snapshot['organizationId'] !== organizationId ||
      a.snapshot['version'] !== a.version
    )
      throw contractProblem();
  }
  return p.data;
}
export function calendarMinute(value: string, end = false): number | null {
  if (end && value === '24:00') return 1440;
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  if (h === undefined || m === undefined || h > 23 || m > 59 || m % 15)
    return null;
  return h * 60 + m;
}
export function calendarTime(minute: number) {
  return (
    String(Math.floor(minute / 60)).padStart(2, '0') +
    ':' +
    String(minute % 60).padStart(2, '0')
  );
}
export function colombiaInstant(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const instant = Date.parse(value + ':00-05:00');
  if (!Number.isFinite(instant)) return null;
  const roundtrip = new Date(instant - 5 * 3600000).toISOString().slice(0, 16);
  return roundtrip === value ? new Date(instant).toISOString() : null;
}
export function colombiaToday(now = Date.now()) {
  return new Date(now - 5 * 3600000).toISOString().slice(0, 10);
}
export function validAvailabilityRange(
  from: string,
  to: string,
  now = Date.now(),
): boolean {
  const a = iso.date().safeParse(from),
    b = iso.date().safeParse(to);
  if (!a.success || !b.success) return false;
  const start = Date.parse(from + 'T00:00:00Z'),
    end = Date.parse(to + 'T00:00:00Z'),
    today = Date.parse(colombiaToday(now) + 'T00:00:00Z');
  return (
    start >= today &&
    end >= start &&
    end - start <= 30 * 86400000 &&
    end <= today + 180 * 86400000
  );
}
export function mapAvailability(
  dto: Availability,
  service: Service,
  resource: Resource,
  q: AvailabilityQuery,
): Availability {
  const p = object({
    serviceVersion: version,
    resourceVersion: version,
    timeZone: literal('America/Bogota'),
    slots: array(
      object({
        startsAt: iso.datetime(),
        endsAt: iso.datetime(),
        remaining: integer(1, 100),
        totalMinor: integer(1, Number.MAX_SAFE_INTEGER),
      }),
    ).check(maxLength(1000)),
    truncated: boolean(),
  }).safeParse(dto);
  if (!p.success) throw contractProblem();
  if (
    p.data.serviceVersion !== service.version ||
    p.data.resourceVersion !== resource.version
  )
    throw new ApiProblem(
      409,
      'CONFLICT',
      'El servicio o el recurso cambiaron. Actualízalos antes de consultar de nuevo.',
    );
  if (!q.from || !q.to || !validAvailabilityRange(q.from, q.to))
    throw inputProblem();
  for (const s of p.data.slots) {
    const day = colombiaToday(Date.parse(s.startsAt));
    if (
      Date.parse(s.endsAt) <= Date.parse(s.startsAt) ||
      day < q.from ||
      day > q.to ||
      s.remaining > resource.capacity ||
      s.totalMinor !==
        service.priceMinor * (service.kind === 'lodging' ? (q.nights ?? 1) : 1)
    )
      throw contractProblem();
  }
  if (new Set(p.data.slots.map((s) => s.startsAt)).size !== p.data.slots.length)
    throw contractProblem();
  return p.data;
}
