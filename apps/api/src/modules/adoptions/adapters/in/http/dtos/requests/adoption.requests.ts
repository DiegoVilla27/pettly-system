import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PUBLICATION_STATUSES } from '../../../../../domain/aggregates/publication';
import { REQUEST_STATUSES } from '../../../../../domain/aggregates/adoption-request';
import { COUNTRY_CODES } from '../../../../../../../shared/domain/profile-details';
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(2)
    .max(max)
    .regex(/^[^\p{Cc}]+$/u);
export const reason = text(500)
  .min(10)
  .meta({ description: 'Decision justification retained in immutable audit.' });
export const version = z
  .number()
  .int()
  .min(1)
  .max(2147483647)
  .meta({ description: 'Current expectedVersion. Stale changes return 409.' });
export const publicationProfile = z.strictObject({
  title: text(150),
  description: text(4000),
  conditions: text(2000).meta({
    description:
      'Adoption requirements shown publicly and accepted by the applicant.',
  }),
  countryCode: z
    .string()
    .refine(
      (value) => COUNTRY_CODES.includes(value),
      'Use an uppercase ISO country code.',
    ),
  city: text(100).meta({
    description:
      'Public locality only; street addresses are never part of the publication.',
  }),
});
export class CreatePublicationDto extends createZodDto(
  z.strictObject({ animalId: z.uuid(), profile: publicationProfile, reason }),
) {}
export class UpdatePublicationDto extends createZodDto(
  z.strictObject({
    profile: publicationProfile
      .partial()
      .refine((value) => Object.keys(value).length > 0),
    reason,
    expectedVersion: version,
  }),
) {}
export class PublicationDecisionDto extends createZodDto(
  z.strictObject({ reason, expectedVersion: version }),
) {}
export class ReviewPublicationDto extends createZodDto(
  z.strictObject({ approved: z.boolean(), reason, expectedVersion: version }),
) {}
export class SubmitAdoptionRequestDto extends createZodDto(
  z.strictObject({
    message: text(2000).min(10),
    expectedPublicationVersion: version.meta({
      description:
        'Version from the public listing you read. A changed listing returns 409 before consent is recorded.',
    }),
    consent: z.literal(true).meta({
      description:
        'Explicit acceptance of the current adoption conditions and consent to share current account name, email, phone, country and city with this shelter. No consent is inferred.',
    }),
  }),
) {}
export class AdoptionRequestDecisionDto extends createZodDto(
  z.strictObject({ reason, expectedVersion: version }),
) {}
export class ReviewAdoptionRequestDto extends createZodDto(
  z.strictObject({
    status: z.enum(['in_review', 'approved', 'rejected']),
    reason,
    expectedVersion: version,
  }),
) {}
export class PublicationParamsDto extends createZodDto(
  z.strictObject({ publicationId: z.uuid() }),
) {}
export class PublicPhotoParamsDto extends createZodDto(
  z.strictObject({ publicationId: z.uuid(), mediaId: z.uuid() }),
) {}
export class OrganizationPublicationsParamsDto extends createZodDto(
  z.strictObject({ organizationId: z.uuid() }),
) {}
export class AdoptionRequestParamsDto extends createZodDto(
  z.strictObject({ adoptionRequestId: z.uuid() }),
) {}
export const pagination = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export class AdoptionPaginationDto extends createZodDto(
  z.strictObject(pagination),
) {}
export class PrivatePublicationsQueryDto extends createZodDto(
  z.strictObject({
    ...pagination,
    status: z.enum(PUBLICATION_STATUSES).optional(),
  }),
) {}
export class AdoptionRequestsQueryDto extends createZodDto(
  z.strictObject({
    ...pagination,
    status: z.enum(REQUEST_STATUSES).optional(),
  }),
) {}
export class PublicPublicationsQueryDto extends createZodDto(
  z.strictObject({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.uuid().optional().meta({
      description:
        'Opaque last-scanned publication UUID from nextCursor. Continue until nextCursor is null; filtered pages can contain fewer results.',
    }),
    search: text(100).optional(),
    species: z
      .enum([
        'dog',
        'cat',
        'bird',
        'rabbit',
        'reptile',
        'rodent',
        'equine',
        'other',
      ])
      .optional(),
    countryCode: z
      .string()
      .refine((value) => COUNTRY_CODES.includes(value))
      .optional(),
    city: text(100).optional(),
  }),
) {}
