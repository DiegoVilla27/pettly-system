import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  MEMBERSHIP_ROLES,
  ORGANIZATION_TYPES,
} from '../../../../../../../shared/domain/authorization';
import { ORGANIZATION_STATUSES } from '../../../../../../../shared/domain/organization-state';
import {
  COUNTRY_CODES,
  PHONE_PATTERN,
} from '../../../../../../../shared/domain/profile-details';
const reason = z
  .string()
  .trim()
  .min(10)
  .max(500)
  .regex(/^[^\p{Cc}]+$/u)
  .meta({
    description:
      'Required administrative justification stored in immutable audit records.',
    example: 'Organization and responsible account reviewed by administration.',
  });

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\p{Cc}]+$/u);
export const organizationProfileSchema = z
  .strictObject({
    name: text(150).min(2).optional().meta({
      description:
        'Organization display name; this does not change its legal identity.',
      example: 'Mascotas Quindío',
    }),
    legalName: text(150).min(2).nullable().optional().meta({
      description:
        'Legal organization name, required before submission. Changes require renewed approval.',
      example: 'Mascotas Quindío SAS',
    }),
    registrationNumber: text(60)
      .transform((value) => value.toUpperCase().replace(/[\s.\-/]/g, ''))
      .pipe(z.string().regex(/^[A-Z0-9]{2,40}$/))
      .nullable()
      .optional()
      .meta({
        description:
          'Registration identifier, normalized uppercase without spaces/dots/hyphens/slashes. Unique with countryCode; not a legal validity check.',
        example: '900.123.456-7',
      }),
    description: text(2000).nullable().optional().meta({
      description:
        'Optional public-facing organization description; plain text.',
    }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email().max(254))
      .nullable()
      .optional()
      .meta({
        description:
          'Organization contact address; separate from user authentication and not email-verified by this workflow.',
        example: 'contact@example.com',
      }),
    phone: z.string().regex(PHONE_PATTERN).nullable().optional().meta({
      description:
        'Organization contact phone in E.164 format; SMS verification is not enabled.',
      example: '+573001234567',
    }),
    website: z
      .url()
      .max(2048)
      .refine((value) => {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
      }, 'An HTTPS URL without credentials is required.')
      .nullable()
      .optional(),
    countryCode: z
      .string()
      .refine(
        (value) => COUNTRY_CODES.includes(value),
        'Use an uppercase ISO 3166-1 alpha-2 code.',
      )
      .nullable()
      .optional()
      .meta({
        description:
          'ISO 3166-1 alpha-2 country; required before review and part of registration uniqueness.',
        example: 'CO',
      }),
    region: text(100).nullable().optional(),
    city: text(100).nullable().optional(),
    address: text(200).nullable().optional(),
    addressLine2: text(200).nullable().optional(),
    postalCode: text(20).nullable().optional(),
  })
  .meta({
    description:
      'Organization contact and legal identity. Required before submission: legalName, registrationNumber, email, phone, countryCode, city and address. Registration identifiers are normalized, not legally certified.',
  });

export class CreateOrganizationRequestDto extends createZodDto(
  z.strictObject({
    name: z
      .string()
      .trim()
      .min(2)
      .max(150)
      .regex(/^[^\p{Cc}]+$/u)
      .meta({ example: 'Refugio Esperanza' }),
    type: z.enum(ORGANIZATION_TYPES).meta({
      description:
        'business for commercial providers; adoption_entity for shelters and adoption organizations.',
    }),
    reason,
    profile: organizationProfileSchema.omit({ name: true }).optional(),
  }),
) {}
export class OrganizationParamsDto extends createZodDto(
  z.strictObject({ organizationId: z.uuid() }),
) {}
export class MembershipParamsDto extends createZodDto(
  z.strictObject({ organizationId: z.uuid(), userId: z.uuid() }),
) {}
export class AssignMembershipRequestDto extends createZodDto(
  z.strictObject({
    role: z.enum(MEMBERSHIP_ROLES).meta({
      description:
        'Must match the organization type. Only super_admin assigns any membership role.',
      example: 'business_admin',
    }),
    reason,
  }),
) {}
export class RemoveMembershipRequestDto extends createZodDto(
  z.strictObject({ reason }),
) {}

export class RequestOrganizationDto extends createZodDto(
  z.strictObject({
    name: text(150).min(2),
    type: z.enum(ORGANIZATION_TYPES),
    profile: organizationProfileSchema.omit({ name: true }).optional(),
  }),
) {}
const expectedVersion = z.number().int().positive().max(2147483647).meta({
  description:
    'Current organization version. A stale version returns HTTP 409.',
});
export class UpdateOrganizationProfileDto extends createZodDto(
  z.strictObject({
    profile: organizationProfileSchema.refine(
      (value) => Object.keys(value).length > 0,
      'At least one profile field is required.',
    ),
    reason,
    expectedVersion,
  }),
) {}
export class OrganizationDecisionDto extends createZodDto(
  z.strictObject({ reason, expectedVersion }),
) {}
export class OrganizationResponsibleDto extends createZodDto(
  z.strictObject({
    reason,
    expectedVersion,
    responsibleUserId: z.uuid().meta({
      description:
        'Explicitly selected active verified account. The superadministrator assigns its matching organization administrator role atomically.',
    }),
  }),
) {}
export class OrganizationStatusDto extends createZodDto(
  z.strictObject({
    reason,
    expectedVersion,
    status: z.enum(['active', 'suspended']),
  }),
) {}
const pagination = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export class OrganizationPaginationDto extends createZodDto(
  z.strictObject(pagination),
) {}
export class ListOrganizationsDto extends createZodDto(
  z.strictObject({
    ...pagination,
    search: text(100).optional(),
    status: z.enum(ORGANIZATION_STATUSES).optional(),
    type: z.enum(ORGANIZATION_TYPES).optional(),
    countryCode: z
      .string()
      .refine((value) => COUNTRY_CODES.includes(value))
      .optional(),
  }),
) {}
