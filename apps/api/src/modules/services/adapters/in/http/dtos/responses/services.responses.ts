import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  SERVICE_SPECIES,
} from '../../../../../domain/aggregates/service';
const id = z.uuid(),
  date = z.iso.datetime(),
  integer = z.number().int();
const profile = {
  name: z.string(),
  description: z.string(),
  category: z.enum(SERVICE_CATEGORIES),
  veterinaryCredentialId: id.nullable(),
  kind: z.enum(['appointment', 'lodging']),
  priceMinor: integer.positive(),
  currency: z.literal('COP'),
  acceptedSpecies: z.array(z.enum(SERVICE_SPECIES)).min(1).max(8),
  requirements: z.string(),
  terms: z.string(),
  collectionMode: z.literal('pay_at_business'),
  confirmationMode: z.enum(['automatic', 'manual']),
  durationMinutes: integer.nullable(),
  bufferBeforeMinutes: integer.nonnegative(),
  bufferAfterMinutes: integer.nonnegative(),
  checkInMinute: integer.nullable(),
  checkOutMinute: integer.nullable(),
  minNights: integer.positive(),
  maxNights: integer.positive(),
  minimumNoticeMinutes: integer.nonnegative(),
  cancellationCutoffMinutes: integer.nonnegative(),
  requestTtlMinutes: integer.positive(),
  resourceIds: z.array(id).max(20),
};
const service = z.strictObject({
  ...profile,
  id,
  organizationId: id,
  status: z.enum(SERVICE_STATUSES),
  version: integer.positive(),
  createdAt: date,
  updatedAt: date,
  timeZone: z.literal('America/Bogota'),
});
const privateService = service.extend({
  createdBy: id,
  reviewedBy: id.nullable(),
  reviewedAt: date.nullable(),
  reviewReason: z.string().nullable(),
});
export class ServiceResponseDto extends createZodDto(privateService) {}
export class PublicServiceDto extends createZodDto(service) {}
export class ManagedServicesDto extends createZodDto(
  z.strictObject({
    items: z.array(privateService).max(50),
    total: integer.nonnegative(),
    page: integer.positive(),
    limit: integer.positive(),
  }),
) {}
export class PublicServicesDto extends createZodDto(
  z.strictObject({
    items: z.array(service).max(50),
    page: integer.positive(),
    limit: integer.positive(),
    nextPage: integer.positive().nullable(),
  }),
) {}
const resource = z.strictObject({
  id,
  organizationId: id,
  name: z.string(),
  kind: z.enum(['appointment', 'lodging']),
  capacity: integer.min(1).max(100),
  status: z.enum(['active', 'inactive']),
  windows: z
    .array(
      z.strictObject({
        day: integer.min(1).max(7),
        startMinute: integer.nonnegative(),
        endMinute: integer.min(1).max(1440),
      }),
    )
    .max(21),
  version: integer.positive(),
  createdAt: date,
  updatedAt: date,
  timeZone: z.literal('America/Bogota'),
});
export class ResourceResponseDto extends createZodDto(resource) {}
export class ResourcesDto extends createZodDto(
  z.strictObject({ items: z.array(resource).max(100) }),
) {}
export class BlockResponseDto extends createZodDto(
  z.strictObject({
    id,
    organizationId: id,
    resourceId: id,
    startsAt: date,
    endsAt: date,
    reason: z.string(),
    createdBy: id,
    createdAt: date,
    releasedAt: date.nullable(),
  }),
) {}
export class ServiceAvailabilityResponseDto extends createZodDto(
  z.strictObject({
    serviceVersion: integer.positive(),
    resourceVersion: integer.positive(),
    timeZone: z.literal('America/Bogota'),
    slots: z
      .array(
        z.strictObject({
          startsAt: date,
          endsAt: date,
          remaining: integer.min(1).max(100),
          totalMinor: integer.positive().max(Number.MAX_SAFE_INTEGER),
        }),
      )
      .max(1000),
    truncated: z.boolean(),
  }),
) {}
export class ServiceAuditsDto extends createZodDto(
  z.strictObject({
    items: z
      .array(
        z.strictObject({
          id,
          organizationId: id,
          serviceId: id.nullable(),
          resourceId: id.nullable(),
          actorId: id,
          action: z.string(),
          version: integer.positive(),
          snapshot: z.record(z.string(), z.unknown()),
          reason: z.string(),
          requestId: z.string(),
          createdAt: date,
        }),
      )
      .max(50),
    total: integer.nonnegative(),
  }),
) {}

export class ActiveServiceBlocksDto extends createZodDto(
  z.strictObject({ items: z.array(BlockResponseDto.schema).max(100) }),
) {}
