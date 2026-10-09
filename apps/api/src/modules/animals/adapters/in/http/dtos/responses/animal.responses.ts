import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { animalProfileSchema } from '../requests/animal.requests';
import { ANIMAL_STATUSES } from '../../../../../domain/aggregates/animal';
export const photoSchema = z.strictObject({
  id: z.uuid(),
  animalId: z.uuid(),
  mediaId: z.uuid(),
  position: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});
export const animalSchema = animalProfileSchema.extend({
  id: z.uuid(),
  ownerUserId: z.uuid().nullable(),
  organizationId: z.uuid().nullable(),
  status: z.enum(ANIMAL_STATUSES),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  archivedAt: z.iso.datetime().nullable(),
});
export class AnimalResponseDto extends createZodDto(animalSchema) {}
export class AnimalDetailDto extends createZodDto(
  animalSchema.extend({ photos: z.array(photoSchema).max(10) }),
) {}
export class AnimalsPageDto extends createZodDto(
  z.strictObject({
    items: z.array(animalSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
) {}
export class AnimalAuditDto extends createZodDto(
  z.strictObject({
    items: z.array(
      z.strictObject({
        id: z.uuid(),
        actorId: z.uuid(),
        animalId: z.uuid(),
        action: z.enum([
          'animal.created',
          'animal.updated',
          'animal.status_changed',
          'animal.photo_added',
          'animal.photo_removed',
          'animal.adopted',
        ]),
        reason: z.string(),
        requestId: z.uuid(),
        createdAt: z.iso.datetime(),
      }),
    ),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
) {}
