import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  SERVICE_SPECIES,
  validateDetails,
  validateResource,
} from '../../../../../domain/aggregates/service';
export const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^[^\p{Cc}]+$/u);
export const version = z
  .number()
  .int()
  .min(1)
  .max(2147483647)
  .meta({ description: 'Current aggregate version. Stale writes return 409.' });
export const reason = text(10, 500).meta({
  description:
    'Audited administrative justification; exclude credentials and pet health details.',
});
export const pagination = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};
export const serviceProfile = z
  .strictObject({
    name: text(2, 150),
    description: text(10, 2000),
    category: z.enum(SERVICE_CATEGORIES),
    veterinaryCredentialId: z.uuid().nullable().optional().meta({
      description:
        'Verified professional credential UUID; required for veterinary appointment services with one dedicated resource.',
    }),
    kind: z.enum(['appointment', 'lodging']),
    priceMinor: z.number().int().min(1).max(2147483647).meta({
      description:
        'Tax-inclusive COP minor units: 100 minor units = 1 COP. Per appointment or per night.',
    }),
    currency: z.literal('COP'),
    acceptedSpecies: z.array(z.enum(SERVICE_SPECIES)).min(1).max(8),
    requirements: text(2, 2000),
    terms: text(10, 2000),
    collectionMode: z.literal('pay_at_business').meta({
      description:
        'Payment is collected by the business. Pettly does not charge this booking online.',
    }),
    confirmationMode: z.enum(['automatic', 'manual']),
    durationMinutes: z.number().int().min(15).max(480).nullable(),
    bufferBeforeMinutes: z.number().int().min(0).max(120),
    bufferAfterMinutes: z.number().int().min(0).max(120),
    checkInMinute: z.number().int().min(0).max(1439).nullable(),
    checkOutMinute: z.number().int().min(0).max(1439).nullable(),
    minNights: z.number().int().min(1).max(30),
    maxNights: z.number().int().min(1).max(30),
    minimumNoticeMinutes: z.number().int().min(15).max(43200),
    cancellationCutoffMinutes: z.number().int().min(0).max(43200),
    requestTtlMinutes: z.number().int().min(15).max(1440),
    resourceIds: z.array(z.uuid()).max(20),
  })
  .superRefine((d, c) => {
    try {
      validateDetails(d);
    } catch (e) {
      c.addIssue({ code: 'custom', message: (e as Error).message });
    }
  });
export const resourceProfile = z
  .strictObject({
    name: text(2, 100),
    kind: z.enum(['appointment', 'lodging']),
    capacity: z.number().int().min(1).max(100),
    status: z.enum(['active', 'inactive']),
    windows: z
      .array(
        z.strictObject({
          day: z.number().int().min(1).max(7).meta({
            description:
              'ISO weekday: Monday 1 through Sunday 7, in America/Bogota.',
          }),
          startMinute: z.number().int().min(0).max(1439),
          endMinute: z.number().int().min(1).max(1440),
        }),
      )
      .min(1)
      .max(21),
  })
  .superRefine((d, c) => {
    try {
      validateResource(d);
    } catch (e) {
      c.addIssue({ code: 'custom', message: (e as Error).message });
    }
  });
export class CreateServiceDto extends createZodDto(
  z.strictObject({ organizationId: z.uuid(), profile: serviceProfile, reason }),
) {}
export class UpdateServiceDto extends createZodDto(
  z.strictObject({
    organizationId: z.uuid(),
    profile: serviceProfile,
    expectedVersion: version,
    reason,
  }),
) {}
export class CreateResourceDto extends createZodDto(
  z.strictObject({
    organizationId: z.uuid(),
    profile: resourceProfile,
    reason,
  }),
) {}
export class UpdateResourceDto extends createZodDto(
  z.strictObject({
    organizationId: z.uuid(),
    profile: resourceProfile,
    expectedVersion: version,
    reason,
  }),
) {}
export class ServiceParamsDto extends createZodDto(
  z.strictObject({ serviceId: z.uuid() }),
) {}
export class ResourceParamsDto extends createZodDto(
  z.strictObject({ resourceId: z.uuid() }),
) {}
export class BlockParamsDto extends createZodDto(
  z.strictObject({ resourceId: z.uuid(), blockId: z.uuid() }),
) {}
export class DecisionDto extends createZodDto(
  z.strictObject({ expectedVersion: version, reason }),
) {}
export class ReviewDto extends createZodDto(
  z.strictObject({ expectedVersion: version, reason, approved: z.boolean() }),
) {}
export class BlockDto extends createZodDto(
  z.strictObject({
    expectedVersion: version,
    reason,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  }),
) {}
export class PageDto extends createZodDto(z.strictObject(pagination)) {}
export class ResourceQueryDto extends createZodDto(
  z.strictObject({ organizationId: z.uuid() }),
) {}
const filters = {
  ...pagination,
  organizationId: z.uuid().optional(),
  search: text(2, 100).optional(),
  category: z.enum(SERVICE_CATEGORIES).optional(),
  kind: z.enum(['appointment', 'lodging']).optional(),
};
export class PublicServicesQueryDto extends createZodDto(
  z.strictObject(filters),
) {}
export class ManagedServicesQueryDto extends createZodDto(
  z.strictObject({
    ...filters,
    organizationId: z.uuid(),
    status: z.enum(SERVICE_STATUSES).optional(),
  }),
) {}
export class AvailabilityDto extends createZodDto(
  z.strictObject({
    resourceId: z.uuid(),
    from: z.iso.date(),
    to: z.iso.date(),
    nights: z.coerce.number().int().min(1).max(30).default(1),
  }),
) {}

export class ActiveBlocksQueryDto extends createZodDto(
  z.strictObject({ from: z.iso.datetime(), to: z.iso.datetime() }),
) {}
