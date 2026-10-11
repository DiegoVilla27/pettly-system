import {
  string,
  nullable,
  optional,
  strictObject,
  iso,
  refine,
  regex,
  minLength,
  maxLength,
  enum as enumeration,
  object,
  uuid,
  email,
  array,
  number,
  int,
  positive,
  nonnegative,
  boolean,
} from 'zod/mini';
import { countryCodes } from '@pettly/api-client';
import { ApiProblem } from '../../../core/api';
import type { Profile, Sessions } from '../models/account';
const shortText = (max: number) =>
  string().check(minLength(1), maxLength(max), regex(/^[^\p{Cc}]+$/u));
export const nameSchema = shortText(100).check(
  regex(/^[\p{L}\p{M} .’'-]+$/u),
  refine((value) => /\p{L}/u.test(value)),
);
export const birthDateSchema = iso.date().check(
  refine((value) => {
    const today = new Date(),
      date = new Date(value + 'T00:00:00.000Z');
    const age =
      today.getUTCFullYear() -
      date.getUTCFullYear() -
      (today.toISOString().slice(5, 10) < value.slice(5) ? 1 : 0);
    return value <= today.toISOString().slice(0, 10) && age <= 120;
  }),
);
export const profileSchema = strictObject({
  name: optional(nameSchema),
  lastName: optional(nameSchema),
  dateOfBirth: optional(nullable(birthDateSchema)),
  phone: optional(nullable(string().check(regex(/^\+[1-9]\d{6,14}$/)))),
  address: optional(nullable(shortText(200))),
  addressLine2: optional(nullable(shortText(200))),
  countryCode: optional(nullable(enumeration(countryCodes))),
  region: optional(nullable(shortText(100))),
  city: optional(nullable(shortText(100))),
  postalCode: optional(nullable(shortText(20))),
});

export function mapProfile(dto: Profile, expectedId: string): Profile {
  const result = object({
    id: uuid(),
    email: email(),
    name: nameSchema,
    lastName: nullable(nameSchema),
    dateOfBirth: nullable(iso.date()),
    age: nullable(number().check(int(), nonnegative())),
    phone: nullable(string()),
    countryCode: nullable(enumeration(countryCodes)),
    region: nullable(string()),
    city: nullable(string()),
    address: nullable(string()),
    addressLine2: nullable(string()),
    postalCode: nullable(string()),
    status: enumeration(['active']),
    globalRole: enumeration(['user', 'moderator', 'super_admin']),
    emailVerifiedAt: nullable(iso.datetime()),
    deletedAt: nullable(iso.datetime()),
    createdAt: iso.datetime(),
    updatedAt: iso.datetime(),
  }).safeParse(dto);
  if (!result.success || result.data.id !== expectedId)
    throw new ApiProblem(
      502,
      'INVALID_RESPONSE',
      'No pudimos validar tu perfil.',
    );
  return result.data;
}
export function mapSessions(dto: Sessions, page: number): Sessions {
  const result = object({
    items: array(
      object({
        id: uuid(),
        createdAt: iso.datetime(),
        expiresAt: iso.datetime(),
        current: boolean(),
      }),
    ).check(maxLength(20)),
    total: number().check(int(), nonnegative()),
    page: number().check(int(), positive()),
    limit: number().check(int(), positive()),
  }).safeParse(dto);
  if (
    !result.success ||
    result.data.page !== page ||
    result.data.limit !== 20 ||
    result.data.total < result.data.items.length ||
    new Set(result.data.items.map((s) => s.id)).size !==
      result.data.items.length ||
    result.data.items.filter((s) => s.current).length > 1
  )
    throw new ApiProblem(
      502,
      'INVALID_RESPONSE',
      'No pudimos validar tus sesiones.',
    );
  return result.data;
}
