import {
  object,
  strictObject,
  string,
  uuid,
  number,
  int,
  refine,
  minLength,
  maxLength,
  regex,
  array,
  literal,
  nullable,
  optional,
  iso,
  record,
  unknown,
  enum as enumeration,
} from 'zod/mini';
import type { ParamMap } from '@angular/router';
import type { ApiResponse } from '@pettly/api-client';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import {
  statuses,
  categories,
  type Service,
  type ServiceProfile,
  type ServicePage,
  type ServiceQuery,
  type Resource,
  type Audit,
  type Company,
} from '../models/service';
const integer = (min: number, max: number) =>
  number().check(
    int(),
    refine((n) => n >= min && n <= max),
  );
export const version = integer(1, 2147483647);
const text = (min: number, max: number) =>
  string().check(minLength(min), maxLength(max), regex(/^[^\p{Cc}]+$/u));
const kind = enumeration(['appointment', 'lodging']);
const species = enumeration([
  'dog',
  'cat',
  'bird',
  'rabbit',
  'reptile',
  'rodent',
  'equine',
  'other',
]);
const profileFields = {
  name: text(2, 150),
  description: text(10, 2000),
  category: enumeration([
    'grooming',
    'daycare',
    'training',
    'lodging',
    'veterinary',
  ]),
  veterinaryCredentialId: nullable(uuid()),
  kind,
  priceMinor: integer(1, 2147483647),
  currency: literal('COP'),
  acceptedSpecies: array(species).check(minLength(1), maxLength(8)),
  requirements: text(2, 2000),
  terms: text(10, 2000),
  collectionMode: literal('pay_at_business'),
  confirmationMode: enumeration(['automatic', 'manual']),
  durationMinutes: nullable(integer(15, 480)),
  bufferBeforeMinutes: integer(0, 120),
  bufferAfterMinutes: integer(0, 120),
  checkInMinute: nullable(integer(0, 1439)),
  checkOutMinute: nullable(integer(0, 1439)),
  minNights: integer(1, 30),
  maxNights: integer(1, 30),
  minimumNoticeMinutes: integer(15, 43200),
  cancellationCutoffMinutes: integer(0, 43200),
  requestTtlMinutes: integer(15, 1440),
  resourceIds: array(uuid()).check(maxLength(20)),
};
export function validProfile(p: ServiceProfile): boolean {
  if (
    new Set(p.acceptedSpecies).size !== p.acceptedSpecies.length ||
    new Set(p.resourceIds).size !== p.resourceIds.length ||
    p.maxNights < p.minNights
  )
    return false;
  if (
    p.category === 'veterinary'
      ? !p.veterinaryCredentialId ||
        p.resourceIds.length !== 1 ||
        p.kind !== 'appointment'
      : !!p.veterinaryCredentialId
  )
    return false;
  if (p.kind === 'appointment')
    return (
      p.category !== 'lodging' &&
      p.durationMinutes !== null &&
      p.durationMinutes % 15 === 0 &&
      p.bufferBeforeMinutes % 15 === 0 &&
      p.bufferAfterMinutes % 15 === 0 &&
      p.checkInMinute === null &&
      p.checkOutMinute === null &&
      p.minNights === 1 &&
      p.maxNights === 1
    );
  return (
    p.category === 'lodging' &&
    p.durationMinutes === null &&
    p.bufferBeforeMinutes === 0 &&
    p.bufferAfterMinutes === 0 &&
    p.checkInMinute !== null &&
    p.checkOutMinute !== null &&
    p.checkOutMinute < p.checkInMinute &&
    p.checkInMinute % 15 === 0 &&
    p.checkOutMinute % 15 === 0
  );
}
export const profileSchema = strictObject(profileFields).check(
  refine(validProfile),
);
export const serviceSchema = object({
  ...profileFields,
  id: uuid(),
  organizationId: uuid(),
  status: enumeration([
    'draft',
    'pending',
    'published',
    'rejected',
    'paused',
    'archived',
  ]),
  version,
  createdBy: uuid(),
  reviewedBy: nullable(uuid()),
  reviewedAt: nullable(iso.datetime()),
  reviewReason: nullable(reasonSchema),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
  timeZone: literal('America/Bogota'),
}).check(refine(validProfile));
export const decisionSchema = strictObject({
  expectedVersion: version,
  reason: reasonSchema,
});
export const createSchema = strictObject({
  organizationId: uuid(),
  profile: profileSchema,
  reason: reasonSchema,
});
export const updateSchema = strictObject({
  organizationId: uuid(),
  profile: profileSchema,
  expectedVersion: version,
  reason: reasonSchema,
});
const paging = { page: integer(1, 10000), limit: integer(1, 50) };
export const querySchema = strictObject({
  ...paging,
  organizationId: uuid(),
  search: optional(text(2, 100)),
  category: optional(profileFields.category),
  kind: optional(kind),
  status: optional(serviceSchema.shape.status),
});
export const reviewQuerySchema = strictObject(paging);
const pageSchema = object({
  items: array(serviceSchema).check(maxLength(50)),
  total: integer(0, Number.MAX_SAFE_INTEGER),
  ...paging,
});
const windowSchema = object({
  day: integer(1, 7),
  startMinute: integer(0, 1439),
  endMinute: integer(1, 1440),
}).check(
  refine(
    (w) =>
      w.startMinute < w.endMinute &&
      w.startMinute % 15 === 0 &&
      w.endMinute % 15 === 0,
  ),
);
const resourceSchema = object({
  id: uuid(),
  organizationId: uuid(),
  name: text(2, 100),
  kind,
  capacity: integer(1, 100),
  status: enumeration(['active', 'inactive']),
  windows: array(windowSchema).check(minLength(1), maxLength(21)),
  version,
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
  timeZone: literal('America/Bogota'),
});
const auditSchema = object({
  id: uuid(),
  organizationId: uuid(),
  serviceId: nullable(uuid()),
  resourceId: nullable(uuid()),
  actorId: uuid(),
  action: enumeration([
    'created',
    'updated',
    'submit',
    'review',
    'pause',
    'archive',
  ]),
  version,
  snapshot: record(string(), unknown()),
  reason: reasonSchema,
  requestId: uuid(),
  createdAt: iso.datetime(),
});
export function inputProblem() {
  return new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa los campos, las políticas y los identificadores del servicio.',
  );
}
export function contractProblem() {
  return new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos confirmar los datos del servicio. Actualiza antes de continuar.',
  );
}
export function validId(id: string) {
  if (!uuid().safeParse(id).success) throw inputProblem();
}
export function mapService(
  dto: Service,
  id?: string,
  organizationId?: string,
): Service {
  const p = serviceSchema.safeParse(dto);
  if (
    !p.success ||
    (id && p.data.id !== id) ||
    (organizationId && p.data.organizationId !== organizationId)
  )
    throw contractProblem();
  if (
    ['published', 'rejected'].includes(p.data.status) &&
    (!p.data.reviewedBy || !p.data.reviewedAt || !p.data.reviewReason)
  )
    throw contractProblem();
  return p.data;
}
export function mapPage(
  dto: ServicePage,
  page: number,
  limit: number,
  organizationId?: string,
  review = false,
): ServicePage {
  const p = pageSchema.safeParse(dto);
  if (
    !p.success ||
    p.data.page !== page ||
    p.data.limit !== limit ||
    p.data.items.length > limit ||
    p.data.items.length > p.data.total ||
    new Set(p.data.items.map((s) => s.id)).size !== p.data.items.length
  )
    throw contractProblem();
  return {
    ...p.data,
    items: p.data.items.map((s) => {
      const v = mapService(s, undefined, organizationId);
      if (review && v.status !== 'pending') throw contractProblem();
      return v;
    }),
  };
}
export function mapResources(
  dto: ApiResponse<'listManagedServiceResources'>,
  organizationId: string,
): Resource[] {
  const p = object({
    items: array(resourceSchema).check(maxLength(100)),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.items.some((r) => r.organizationId !== organizationId) ||
    new Set(p.data.items.map((r) => r.id)).size !== p.data.items.length
  )
    throw contractProblem();
  return p.data.items;
}
export function mapAudit(
  dto: ApiResponse<'listServiceAudit'>,
  id: string,
  organizationId: string,
): { items: Audit[]; total: number } {
  const p = object({
    items: array(auditSchema).check(maxLength(20)),
    total: integer(0, Number.MAX_SAFE_INTEGER),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.items.some(
      (a) =>
        a.serviceId !== id ||
        a.organizationId !== organizationId ||
        a.resourceId !== null,
    ) ||
    new Set(p.data.items.map((a) => a.id)).size !== p.data.items.length
  )
    throw contractProblem();
  // Persisted snapshots precede the HTTP timeZone projection. Validate owned identity/version without returning arbitrary JSON to the view.
  for (const a of p.data.items)
    if (
      a.snapshot['id'] !== id ||
      a.snapshot['organizationId'] !== organizationId ||
      a.snapshot['version'] !== a.version
    )
      throw contractProblem();
  return p.data;
}
export function mapCompany(
  dto: Pick<
    ApiResponse<'getOrganizationProfile'>,
    'id' | 'name' | 'type' | 'status'
  >,
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
export function parseFilters(params: ParamMap): ServiceQuery | null {
  const organizationId = params.get('organizationId');
  if (!organizationId || !uuid().safeParse(organizationId).success) return null;
  const page = Number(params.get('page') ?? 1),
    limit = Number(params.get('limit') ?? 20),
    search = params.get('search')?.trim(),
    category = params.get('category'),
    status = params.get('status');
  return {
    organizationId,
    page: Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 20,
    ...(search && text(2, 100).safeParse(search).success ? { search } : {}),
    ...(categories.some((c) => c.value === category)
      ? { category: category as Service['category'] }
      : {}),
    ...(statuses.some((s) => s.value === status)
      ? { status: status as Service['status'] }
      : {}),
  };
}
export { copToMinor } from '../../../shared/forms/minor-money';
export function minuteFromTime(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  const minute = (h ?? 24) * 60 + (m ?? 60);
  return (h ?? 24) < 24 && (m ?? 60) < 60 && minute % 15 === 0 ? minute : null;
}
export function timeFromMinute(value: number | null): string {
  return value === null
    ? ''
    : String(Math.floor(value / 60)).padStart(2, '0') +
        ':' +
        String(value % 60).padStart(2, '0');
}
