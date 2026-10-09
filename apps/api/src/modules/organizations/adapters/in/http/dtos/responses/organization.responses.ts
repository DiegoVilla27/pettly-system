import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  MEMBERSHIP_ROLES,
  ORGANIZATION_TYPES,
} from '../../../../../../../shared/domain/authorization';
import { ORGANIZATION_STATUSES } from '../../../../../../../shared/domain/organization-state';
export const organizationResponseSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().min(2).max(150),
  type: z.enum(ORGANIZATION_TYPES),
  status: z.enum(ORGANIZATION_STATUSES),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const membershipResponseSchema = z.strictObject({
  id: z.uuid(),
  organizationId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(MEMBERSHIP_ROLES),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export class OrganizationResponseDto extends createZodDto(
  organizationResponseSchema,
) {}
export class MembershipResponseDto extends createZodDto(
  membershipResponseSchema,
) {}
export class MembershipRemovedResponseDto extends createZodDto(
  z.strictObject({ message: z.literal('Organization role removed.') }),
) {}

const nullableDate = z.iso.datetime().nullable();
export const organizationProfileResponseSchema =
  organizationResponseSchema.extend({
    legalName: z.string().nullable(),
    registrationNumber: z.string().nullable(),
    description: z.string().nullable(),
    email: z.email().nullable(),
    phone: z.string().nullable(),
    website: z.url().nullable(),
    countryCode: z.string().nullable(),
    region: z.string().nullable(),
    city: z.string().nullable(),
    address: z.string().nullable(),
    addressLine2: z.string().nullable(),
    postalCode: z.string().nullable(),
    applicantId: z.uuid().nullable(),
    responsibleUserId: z.uuid().nullable(),
    submittedAt: nullableDate,
    reviewedAt: nullableDate,
    reviewedBy: z.uuid().nullable(),
    reviewReason: z.string().nullable(),
    approvedAt: nullableDate,
    suspendedAt: nullableDate,
    deletedAt: nullableDate,
  });
const page = <T extends z.ZodType>(item: T) =>
  z.strictObject({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().min(1).max(100),
  });
export class OrganizationProfileResponseDto extends createZodDto(
  organizationProfileResponseSchema,
) {}
export class OrganizationPageResponseDto extends createZodDto(
  page(organizationResponseSchema),
) {}
export class OrganizationMembersResponseDto extends createZodDto(
  page(membershipResponseSchema),
) {}
export class OrganizationAuditResponseDto extends createZodDto(
  page(
    z.strictObject({
      id: z.uuid(),
      actorId: z.uuid(),
      organizationId: z.uuid(),
      targetUserId: z.uuid().nullable(),
      action: z.enum([
        'organization.created',
        'organization.requested',
        'organization.profile_updated',
        'organization.submitted',
        'organization.approved',
        'organization.rejected',
        'organization.status_changed',
        'organization.responsible_changed',
        'organization.deleted',
        'membership.role_assigned',
        'membership.role_removed',
      ]),
      previousValue: z.string().nullable(),
      nextValue: z.string().nullable(),
      reason: z.string(),
      requestId: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
) {}
export class OrganizationDeletedDto extends createZodDto(
  z.strictObject({ message: z.literal('Organization archived.') }),
) {}
