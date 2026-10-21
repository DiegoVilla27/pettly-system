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
  uuid,
  nullable,
  iso,
  literal,
  array,
  boolean,
  enum as enumeration,
  optional,
} from 'zod/mini';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import type {
  Publication,
  Profile,
  Context,
  Filters,
  PublicationPage,
  Audit,
  Candidate,
} from '../models/publication';
const text = (min: number, max: number) =>
  string().check(minLength(min), maxLength(max), regex(/^[^\p{Cc}]+$/u));
const integer = (min: number, max: number) =>
  number().check(
    int(),
    refine((n) => n >= min && n <= max),
  );
const version = integer(1, 2147483647);
export const profileSchema = strictObject({
  title: text(2, 150),
  description: text(2, 4000),
  conditions: text(2, 2000),
  countryCode: literal('CO'),
  city: text(2, 100),
});
export const decisionSchema = strictObject({
  reason: reasonSchema,
  expectedVersion: version,
});
export const statusSchema = enumeration([
  'draft',
  'pending',
  'published',
  'rejected',
  'paused',
  'closed',
  'deleted',
]);
export const filtersSchema = strictObject({
  page: integer(1, 100000),
  limit: integer(1, 100),
  review: boolean(),
  organizationId: optional(uuid()),
  status: optional(statusSchema),
}).check(
  refine((f) =>
    f.review ? !f.organizationId && !f.status : !!f.organizationId,
  ),
);
export const contextSchema = strictObject({
  publicationId: uuid(),
  organizationId: optional(uuid()),
  review: boolean(),
}).check(refine((c) => (c.review ? !c.organizationId : !!c.organizationId)));
const photo = object({
  id: uuid(),
  animalId: uuid(),
  mediaId: uuid(),
  position: integer(0, 2147483647),
  createdAt: iso.datetime(),
});
// Only safe public animal fields survive this projection, including unexpected private properties.
const snapshot = object({
  id: uuid(),
  name: text(1, 100),
  species: enumeration([
    'dog',
    'cat',
    'bird',
    'rabbit',
    'reptile',
    'rodent',
    'equine',
    'other',
  ]),
  breed: nullable(text(1, 100)),
  sex: enumeration(['male', 'female', 'unknown']),
  size: enumeration(['small', 'medium', 'large', 'extra_large', 'unknown']),
  dateOfBirth: nullable(iso.date()),
  birthDateEstimated: boolean(),
  color: nullable(text(1, 100)),
  description: nullable(text(1, 2000)),
  specialNeeds: nullable(text(1, 2000)),
  photos: array(photo).check(maxLength(10)),
});
const publicationSchema = object({
  title: text(2, 150),
  description: text(2, 4000),
  conditions: text(2, 2000),
  countryCode: text(2, 2),
  city: text(2, 100),
  id: uuid(),
  animalId: uuid(),
  organizationId: uuid(),
  version,
  status: statusSchema,
  snapshot: nullable(snapshot),
  createdBy: uuid(),
  reviewedBy: nullable(uuid()),
  reviewReason: nullable(text(1, 500)),
  reviewedAt: nullable(iso.datetime()),
  submittedAt: nullable(iso.datetime()),
  publishedAt: nullable(iso.datetime()),
  closedAt: nullable(iso.datetime()),
  deletedAt: nullable(iso.datetime()),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
}).check(
  refine(
    (p) =>
      Date.parse(p.updatedAt) >= Date.parse(p.createdAt) &&
      (!p.snapshot ||
        (p.snapshot.id === p.animalId &&
          p.snapshot.photos.every((x) => x.animalId === p.animalId) &&
          new Set(p.snapshot.photos.map((x) => x.mediaId)).size ===
            p.snapshot.photos.length)),
  ),
);
export const invalid = () =>
  new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa el refugio, la publicación y los datos.',
  );
export const contract = () =>
  new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar la publicación de adopción.',
  );
export function mapPublication(dto: unknown, c?: Context): Publication {
  const r = publicationSchema.safeParse(dto);
  if (
    !r.success ||
    (c &&
      (r.data.id !== c.publicationId ||
        (!c.review && r.data.organizationId !== c.organizationId)))
  )
    throw contract();
  return r.data;
}
export function mapPage(dto: unknown, f: Filters): PublicationPage {
  const r = object({
    items: array(publicationSchema).check(maxLength(100)),
    total: integer(0, Number.MAX_SAFE_INTEGER),
    page: integer(1, 100000),
    limit: integer(1, 100),
  }).safeParse(dto);
  if (
    !r.success ||
    r.data.page !== f.page ||
    r.data.limit !== f.limit ||
    r.data.items.length > f.limit ||
    r.data.total < r.data.items.length ||
    new Set(r.data.items.map((p) => p.id)).size !== r.data.items.length ||
    r.data.items.some((p) =>
      f.review
        ? p.status !== 'pending'
        : p.organizationId !== f.organizationId ||
          (f.status && p.status !== f.status),
    )
  )
    throw contract();
  return r.data;
}
export function mapCandidate(dto: unknown, organizationId: string): Candidate {
  const r = object({
    id: uuid(),
    name: text(1, 100),
    organizationId: uuid(),
    ownerUserId: literal(null),
    status: literal('active'),
  }).safeParse(dto);
  if (!r.success || r.data.organizationId !== organizationId) throw invalid();
  return r.data;
}
export function validateProfile(dto: unknown): Profile {
  const r = profileSchema.safeParse(dto);
  if (!r.success) throw invalid();
  return r.data;
}
export function mapAudit(dto: unknown, c: Context, page: number): Audit {
  const r = object({
    items: array(
      object({
        id: uuid(),
        actorId: uuid(),
        publicationId: uuid(),
        requestId: nullable(uuid()),
        action: enumeration([
          'publication.created',
          'publication.updated',
          'publication.submitted',
          'publication.approved',
          'publication.rejected',
          'publication.paused',
          'publication.deleted',
          'publication.closed',
          'request.submitted',
          'request.reviewed',
          'request.withdrawn',
          'request.completed',
          'request.closed',
        ]),
        reason: text(1, 500),
        correlationId: uuid(),
        createdAt: iso.datetime(),
      }),
    ).check(maxLength(20)),
    total: integer(0, Number.MAX_SAFE_INTEGER),
    page: integer(1, 100000),
    limit: literal(20),
  }).safeParse(dto);
  if (
    !r.success ||
    r.data.page !== page ||
    r.data.total < r.data.items.length ||
    r.data.items.some((e) => e.publicationId !== c.publicationId) ||
    new Set(r.data.items.map((e) => e.id)).size !== r.data.items.length
  )
    throw contract();
  return r.data;
}
