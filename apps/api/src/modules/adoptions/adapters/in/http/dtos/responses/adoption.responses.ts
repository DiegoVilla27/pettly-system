import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { publicationProfile } from '../requests/adoption.requests';
import { PUBLICATION_STATUSES } from '../../../../../domain/aggregates/publication';
import { REQUEST_STATUSES } from '../../../../../domain/aggregates/adoption-request';
const nullableDate = z.iso.datetime().nullable();
const publicAnimal = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  species: z.enum([
    'dog',
    'cat',
    'bird',
    'rabbit',
    'reptile',
    'rodent',
    'equine',
    'other',
  ]),
  breed: z.string().nullable(),
  sex: z.enum(['male', 'female', 'unknown']),
  size: z.enum(['small', 'medium', 'large', 'extra_large', 'unknown']),
  dateOfBirth: z.iso.date().nullable(),
  birthDateEstimated: z.boolean(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  specialNeeds: z.string().nullable(),
  photos: z
    .array(
      z.strictObject({
        id: z.uuid(),
        animalId: z.uuid(),
        mediaId: z.uuid(),
        position: z.number().int().nonnegative(),
        createdAt: z.iso.datetime(),
      }),
    )
    .max(10),
});
const base = publicationProfile.extend({
  id: z.uuid(),
  version: z.number().int().positive(),
  animalId: z.uuid(),
  organizationId: z.uuid(),
  snapshot: publicAnimal.nullable(),
  publishedAt: nullableDate,
});
export const publicationSchema = base.extend({
  status: z.enum(PUBLICATION_STATUSES),
  version: z.number().int().positive(),
  createdBy: z.uuid(),
  reviewedBy: z.uuid().nullable(),
  reviewedAt: nullableDate,
  reviewReason: z.string().nullable(),
  submittedAt: nullableDate,
  closedAt: nullableDate,
  deletedAt: nullableDate,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const adoptionRequestSchema = z.strictObject({
  id: z.uuid(),
  publicationId: z.uuid(),
  applicantId: z.uuid(),
  message: z.string(),
  consentedAt: z.iso.datetime(),
  publicationVersion: z.number().int().positive(),
  conditionsAccepted: z.string().min(2).max(2000),
  status: z.enum(REQUEST_STATUSES),
  version: z.number().int().positive(),
  reviewedBy: z.uuid().nullable(),
  reviewedAt: nullableDate,
  reviewReason: z.string().nullable(),
  completedAt: nullableDate,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const page = <T extends z.ZodType>(schema: T) =>
  z.strictObject({
    items: z.array(schema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  });
export class PublicationResponseDto extends createZodDto(publicationSchema) {}
export class PublicPublicationResponseDto extends createZodDto(base) {}
export class PublicPublicationsResponseDto extends createZodDto(
  z.strictObject({ items: z.array(base), nextCursor: z.uuid().nullable() }),
) {}
export class PrivatePublicationsResponseDto extends createZodDto(
  page(publicationSchema),
) {}
export class AdoptionRequestResponseDto extends createZodDto(
  adoptionRequestSchema,
) {}
export class AdoptionRequestsResponseDto extends createZodDto(
  page(adoptionRequestSchema),
) {}
export class AdoptionRequestDetailDto extends createZodDto(
  adoptionRequestSchema.extend({
    contact: z
      .strictObject({
        name: z.string(),
        lastName: z.string().nullable(),
        email: z.email(),
        phone: z.string().nullable(),
        countryCode: z.string().nullable(),
        city: z.string().nullable(),
      })
      .nullable()
      .meta({
        description:
          'Current consented applicant contact. Null after account anonymization; no address, birth date or authentication data.',
      }),
  }),
) {}
export class PublicationDeletedDto extends createZodDto(
  z.strictObject({ message: z.literal('Publication archived.') }),
) {}
export class AdoptionAuditResponseDto extends createZodDto(
  page(
    z.strictObject({
      id: z.uuid(),
      actorId: z.uuid(),
      publicationId: z.uuid(),
      requestId: z.uuid().nullable(),
      action: z.enum([
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
      reason: z.string(),
      correlationId: z.uuid(),
      createdAt: z.iso.datetime(),
    }),
  ),
) {}
