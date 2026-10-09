import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  PROFESSIONS,
  CREDENTIAL_STATUSES,
} from '../../../../../domain/credential';
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^[^\p{Cc}]+$/u);
const reason = text(10, 500),
  version = z.number().int().min(1).max(2147483647);
const profile = z.strictObject({
  profession: z.enum(PROFESSIONS),
  registrationNumber: z
    .string()
    .regex(/^\d{1,15}$/)
    .meta({
      description:
        'COMVEZCOL registration number. Upload alone does not verify legal authorization.',
    }),
  university: text(2, 150),
  consent: z.literal(true).meta({
    description:
      'Explicit professional consent to private processing of accreditation evidence.',
  }),
});
const identities = {
  organizationId: z.uuid(),
  professionalId: z.uuid(),
  resourceId: z.uuid(),
};
export class CreateCredentialDto extends createZodDto(
  z.strictObject({ ...identities, profile, reason }),
) {}
export class ConfigureCredentialDto extends createZodDto(
  z.strictObject({ ...identities, profile, reason, expectedVersion: version }),
) {}
export class CredentialParamsDto extends createZodDto(
  z.strictObject({ credentialId: z.uuid() }),
) {}
export class DocumentParamsDto extends createZodDto(
  z.strictObject({ credentialId: z.uuid(), mediaId: z.uuid() }),
) {}
export class CredentialDecisionDto extends createZodDto(
  z.strictObject({ reason, expectedVersion: version }),
) {}
export class ReviewCredentialDto extends createZodDto(
  z.strictObject({
    reason,
    expectedVersion: version,
    approved: z.boolean(),
    verifiedUntil: z.iso.datetime().nullable(),
    verificationReference: text(10, 500).nullable().meta({
      description:
        'Human reviewer evidence/reference from official COMVEZCOL verification. Never automatically fetched.',
    }),
    officialRegisterChecked: z.literal(true).meta({
      description:
        'Reviewer attests identity, veterinary qualification, registration and current authorization were independently checked.',
    }),
  }),
) {}
export class UploadCredentialDto extends createZodDto(
  z.strictObject({
    reason,
    expectedVersion: z.coerce.number().int().min(1),
    kind: z.enum([
      'professional_card',
      'qualification',
      'standing_certificate',
    ]),
  }),
) {}
export class CredentialPageDto extends createZodDto(
  z.strictObject({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
) {}
export class CredentialsFilterDto extends createZodDto(
  CredentialPageDto.schema.extend({
    organizationId: z.uuid().optional(),
    status: z.enum(CREDENTIAL_STATUSES).optional(),
  }),
) {}
