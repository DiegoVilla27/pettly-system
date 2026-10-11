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
  nullable,
  boolean,
  uuid,
  iso,
  array,
  literal,
  optional,
} from 'zod/mini';
import type { ParamMap } from '@angular/router';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import type {
  Animal,
  AnimalRecord,
  AnimalQuery,
  AnimalPage,
  AnimalAudit,
  AnimalContext,
  AnimalProfile,
  Shelter,
} from '../models/animal';
export const integer = (min: number, max: number) =>
  number().check(
    int(),
    refine((n) => n >= min && n <= max),
  );
const text = (max: number) =>
  string().check(minLength(1), maxLength(max), regex(/^[^\p{Cc}]+$/u));
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
const status = enumeration(['active', 'adopted', 'deceased', 'archived']);
const version = integer(1, 2147483647);
const profileFields = {
  name: text(100),
  species,
  breed: nullable(text(100)),
  sex: enumeration(['male', 'female', 'unknown']),
  size: enumeration(['small', 'medium', 'large', 'extra_large', 'unknown']),
  dateOfBirth: nullable(iso.date()),
  birthDateEstimated: boolean(),
  weightGrams: nullable(integer(1, 2000000)),
  color: nullable(text(100)),
  description: nullable(text(2000)),
  healthNotes: nullable(text(4000)),
  specialNeeds: nullable(text(2000)),
  vaccinated: nullable(boolean()),
  neutered: nullable(boolean()),
  microchip: nullable(text(30)),
};
export const profileSchema = strictObject(profileFields).check(
  refine(
    (p) =>
      !p.dateOfBirth || p.dateOfBirth <= new Date().toISOString().slice(0, 10),
  ),
);
export const decisionSchema = strictObject({
  reason: reasonSchema,
  expectedVersion: version,
});
export const updateSchema = strictObject({
  profile: profileSchema,
  reason: reasonSchema,
  expectedVersion: version,
});
export const contextSchema = strictObject({
  organizationId: uuid(),
  animalId: uuid(),
});
export const querySchema = strictObject({
  organizationId: uuid(),
  page: integer(1, 100000),
  limit: integer(1, 100),
  search: optional(text(100)),
  species: optional(species),
  status: optional(status),
});

const base = {
  ...profileFields,
  id: uuid(),
  ownerUserId: literal(null),
  organizationId: uuid(),
  status,
  version,
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
  archivedAt: nullable(iso.datetime()),
};
const recordSchema = object(base).check(
  refine(
    (a) =>
      (a.status === 'archived') === (a.archivedAt !== null) &&
      Date.parse(a.updatedAt) >= Date.parse(a.createdAt),
  ),
);
const photoSchema = object({
  id: uuid(),
  animalId: uuid(),
  mediaId: uuid(),
  position: integer(0, 2147483647),
  createdAt: iso.datetime(),
});
const detailSchema = object({
  ...base,
  photos: array(photoSchema).check(maxLength(10)),
}).check(
  refine(
    (a) =>
      (a.status === 'archived') === (a.archivedAt !== null) &&
      Date.parse(a.updatedAt) >= Date.parse(a.createdAt) &&
      a.photos.every((p) => p.animalId === a.id) &&
      new Set(a.photos.map((p) => p.mediaId)).size === a.photos.length &&
      new Set(a.photos.map((p) => p.id)).size === a.photos.length &&
      new Set(a.photos.map((p) => p.position)).size === a.photos.length,
  ),
);
const paging = {
  page: integer(1, 100000),
  limit: integer(1, 100),
  total: integer(0, Number.MAX_SAFE_INTEGER),
};
export function inputProblem() {
  return new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa el refugio, los datos y el motivo del animal.',
  );
}
export function contractProblem() {
  return new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar el registro del animal. Actualiza antes de continuar.',
  );
}
export function mapRecord(dto: unknown, organizationId: string): AnimalRecord {
  const p = recordSchema.safeParse(dto);
  if (!p.success || p.data.organizationId !== organizationId)
    throw contractProblem();
  return p.data;
}
export function mapAnimal(dto: unknown, c: AnimalContext): Animal {
  const p = detailSchema.safeParse(dto);
  if (
    !p.success ||
    p.data.id !== c.animalId ||
    p.data.organizationId !== c.organizationId
  )
    throw contractProblem();
  return p.data;
}
export function mapPage(dto: unknown, q: AnimalQuery): AnimalPage {
  const p = object({
    ...paging,
    items: array(recordSchema).check(maxLength(100)),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.page !== q.page ||
    p.data.limit !== q.limit ||
    p.data.total < p.data.items.length ||
    p.data.items.length > q.limit ||
    new Set(p.data.items.map((a) => a.id)).size !== p.data.items.length ||
    p.data.items.some(
      (a) =>
        a.organizationId !== q.organizationId ||
        (q.status && a.status !== q.status) ||
        (q.species && a.species !== q.species),
    )
  )
    throw contractProblem();
  return {
    ...p.data,
    items: p.data.items.map((a) => ({
      id: a.id,
      organizationId: a.organizationId,
      name: a.name,
      species: a.species,
      sex: a.sex,
      status: a.status,
      version: a.version,
      createdAt: a.createdAt,
    })),
  };
}
export function mapAudit(
  dto: unknown,
  c: AnimalContext,
  page: number,
): AnimalAudit {
  const p = object({
    ...paging,
    items: array(
      object({
        id: uuid(),
        actorId: uuid(),
        animalId: uuid(),
        action: enumeration([
          'animal.created',
          'animal.updated',
          'animal.status_changed',
          'animal.photo_added',
          'animal.photo_removed',
          'animal.adopted',
        ]),
        reason: text(500),
        requestId: uuid(),
        createdAt: iso.datetime(),
      }),
    ).check(maxLength(20)),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.page !== page ||
    p.data.limit !== 20 ||
    p.data.total < p.data.items.length ||
    new Set(p.data.items.map((a) => a.id)).size !== p.data.items.length ||
    p.data.items.some((a) => a.animalId !== c.animalId)
  )
    throw contractProblem();
  return p.data;
}
export function mapShelter(dto: unknown): Shelter {
  const p = object({
    id: uuid(),
    name: text(150),
    type: literal('adoption_entity'),
    status: literal('active'),
  }).safeParse(dto);
  if (!p.success) throw contractProblem();
  return { id: p.data.id, name: p.data.name };
}
export function parseFilters(p: ParamMap): AnimalQuery | null {
  const q = querySchema.safeParse({
    organizationId: p.get('organizationId') ?? '',
    page: Number(p.get('page') ?? 1),
    limit: Number(p.get('limit') ?? 20),
    search: p.get('search') || undefined,
    species: p.get('species') || undefined,
    status: p.get('status') || undefined,
  });
  return q.success ? q.data : null;
}
export function validateProfile(p: unknown): AnimalProfile {
  const result = profileSchema.safeParse(p);
  if (!result.success) throw inputProblem();
  return result.data;
}
