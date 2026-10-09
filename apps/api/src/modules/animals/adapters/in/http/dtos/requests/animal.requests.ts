import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  SPECIES,
  SEXES,
  SIZES,
  ANIMAL_STATUSES,
} from '../../../../../domain/aggregates/animal';
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\p{Cc}]+$/u);
const fields = {
  name: text(100),
  species: z.enum(SPECIES),
  breed: text(100).nullable(),
  sex: z.enum(SEXES),
  size: z.enum(SIZES),
  dateOfBirth: z.iso.date().nullable(),
  birthDateEstimated: z.boolean(),
  weightGrams: z.number().int().min(1).max(2000000).nullable(),
  color: text(100).nullable(),
  description: text(2000).nullable(),
  healthNotes: text(4000).nullable().meta({
    description:
      'Private clinical notes. Never included in public adoption listings.',
  }),
  specialNeeds: text(2000).nullable().meta({
    description:
      'Publicly shareable care needs included only in the reviewed adoption snapshot.',
  }),
  vaccinated: z.boolean().nullable(),
  neutered: z.boolean().nullable(),
  microchip: text(30).nullable().meta({
    description:
      'Private identification, never published in adoption listings.',
  }),
};
export const animalProfileSchema = z.strictObject(fields);
export const reason = text(500).min(10).meta({
  description:
    'Justification saved in immutable audit; avoid secrets and unnecessary personal information.',
  example: 'Animal record updated following the shelter review.',
});
export const version = z.number().int().min(1).max(2147483647).meta({
  description: 'Current expectedVersion. Stale updates return HTTP 409.',
});

// Explicit defaults keep the transport contract aligned with the complete domain profile.
const creation = animalProfileSchema.extend({
  breed: fields.breed.default(null),
  sex: fields.sex.default('unknown'),
  size: fields.size.default('unknown'),
  dateOfBirth: fields.dateOfBirth.default(null),
  birthDateEstimated: fields.birthDateEstimated.default(false),
  weightGrams: fields.weightGrams.default(null),
  color: fields.color.default(null),
  description: fields.description.default(null),
  healthNotes: fields.healthNotes.default(null),
  specialNeeds: fields.specialNeeds.default(null),
  vaccinated: fields.vaccinated.default(null),
  neutered: fields.neutered.default(null),
  microchip: fields.microchip.default(null),
});
export class CreateAnimalDto extends createZodDto(
  z.strictObject({
    profile: creation,
    organizationId: z.uuid().nullable().optional().meta({
      description:
        'Active adoption entity UUID. Omit to register your own personal animal.',
    }),
    reason,
  }),
) {}
export class UpdateAnimalDto extends createZodDto(
  z.strictObject({
    profile: animalProfileSchema
      .partial()
      .refine(
        (value) => Object.keys(value).length > 0,
        'At least one profile field is required.',
      ),
    reason,
    expectedVersion: version,
  }),
) {}
export class AnimalDecisionDto extends createZodDto(
  z.strictObject({ reason, expectedVersion: version }),
) {}
export class AnimalStatusDto extends createZodDto(
  z.strictObject({
    reason,
    expectedVersion: version,
    status: z.enum(['active', 'deceased']),
  }),
) {}
export class AnimalParamsDto extends createZodDto(
  z.strictObject({ animalId: z.uuid() }),
) {}
export class AnimalPhotoParamsDto extends createZodDto(
  z.strictObject({ animalId: z.uuid(), mediaId: z.uuid() }),
) {}
export class UploadAnimalPhotoDto extends createZodDto(
  z.strictObject({
    reason,
    expectedVersion: z.coerce.number().int().min(1).max(2147483647),
  }),
) {}
export const pagination = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export class AnimalPaginationDto extends createZodDto(
  z.strictObject(pagination),
) {}
export class ListAnimalsDto extends createZodDto(
  z.strictObject({
    ...pagination,
    organizationId: z.uuid().optional(),
    search: text(100).optional(),
    species: z.enum(SPECIES).optional(),
    status: z.enum(ANIMAL_STATUSES).optional(),
  }),
) {}
