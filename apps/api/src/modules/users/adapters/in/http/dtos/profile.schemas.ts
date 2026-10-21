import { z } from 'zod';
import { GLOBAL_ROLES } from '../../../../../../shared/domain/authorization';
import {
  givenNameSchema,
  lastNameSchema,
  birthDateSchema,
  optionalProfileShape,
} from '../../../../../../shared/infrastructure/http/profile.schemas';
export const updateProfileSchema = z
  .strictObject({
    name: givenNameSchema.optional(),
    lastName: lastNameSchema.optional(),
    ...optionalProfileShape,
  })
  .refine(
    (fields) => Object.keys(fields).length > 0,
    'Provide at least one profile field.',
  );
export const userResponseSchema = z.strictObject({
  id: z.uuid(),
  email: z.email().max(254),
  name: z.string().min(1).max(100).meta({
    description:
      'Given name(s). Existing pre-migration names are preserved without guessing a surname.',
    example: 'Alex',
  }),
  // Existing accounts keep their previous name intact; surname is unknown until supplied.
  lastName: lastNameSchema.nullable(),
  dateOfBirth: birthDateSchema.nullable(),
  age: z.number().int().min(0).max(120).nullable().meta({
    description:
      'Read-only age calculated from dateOfBirth at response time in UTC.',
    example: 31,
  }),
  phone: optionalProfileShape.phone.unwrap(),
  address: optionalProfileShape.address.unwrap(),
  addressLine2: optionalProfileShape.addressLine2.unwrap(),
  countryCode: optionalProfileShape.countryCode.unwrap(),
  region: optionalProfileShape.region.unwrap(),
  city: optionalProfileShape.city.unwrap(),
  postalCode: optionalProfileShape.postalCode.unwrap(),
  status: z.enum(['active', 'disabled', 'deleted']),
  globalRole: z.enum(GLOBAL_ROLES).meta({
    description:
      'Platform role assigned only by a super administrator. Company and adoption roles are scoped organization memberships. Registration always starts with user.',
  }),
  emailVerifiedAt: z.iso.datetime().nullable(),
  deletedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
