import { z } from 'zod';
import {
  COUNTRY_CODES,
  NAME_PATTERN,
  PHONE_PATTERN,
  ageOn,
} from '../../domain/profile-details';
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\p{Cc}]+$/u, 'Control characters are not allowed.');
export const givenNameSchema = text(100)
  .regex(NAME_PATTERN)
  .refine((value) => /\p{L}/u.test(value), 'A name must contain letters.')
  .meta({
    description:
      'Given name(s). Unicode letters, spaces, apostrophes, periods and hyphens are supported.',
    example: 'Alex',
  });
export const lastNameSchema = givenNameSchema.meta({
  description: 'Family name(s). Kept separate from given names.',
  example: 'Rivera',
});
export const birthDateSchema = z.iso
  .date()
  .refine(
    (date) =>
      date <= new Date().toISOString().slice(0, 10) &&
      ageOn(date, new Date()) <= 120,
    'Birth date must not be in the future or more than 120 years ago.',
  )
  .meta({
    description:
      'Date of birth as YYYY-MM-DD; age is calculated from this value in UTC. No future dates or ages above 120.',
    example: '1995-06-15',
  });
export const optionalProfileShape = {
  dateOfBirth: birthDateSchema.nullable().optional(),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN)
    .meta({
      description:
        'International E.164 telephone number; formatting is checked, ownership is not verified.',
      example: '+34612345678',
    })
    .nullable()
    .optional(),
  address: text(200)
    .meta({
      description: 'Street address and building number.',
      example: 'Calle Mayor 10',
    })
    .nullable()
    .optional(),
  addressLine2: text(200)
    .meta({
      description:
        'Optional apartment, floor or additional address information.',
      example: 'Floor 2, apartment B',
    })
    .nullable()
    .optional(),
  countryCode: z
    .enum(COUNTRY_CODES as [string, ...string[]])
    .meta({
      description: 'Uppercase ISO 3166-1 alpha-2 country code.',
      example: 'ES',
    })
    .nullable()
    .optional(),
  region: text(100)
    .meta({
      description: 'State, province or administrative region.',
      example: 'Comunidad de Madrid',
    })
    .nullable()
    .optional(),
  city: text(100)
    .meta({ description: 'City or locality.', example: 'Madrid' })
    .nullable()
    .optional(),
  postalCode: text(20)
    .meta({
      description:
        'Postal code. International formats and leading zeros are preserved.',
      example: '28013',
    })
    .nullable()
    .optional(),
};
