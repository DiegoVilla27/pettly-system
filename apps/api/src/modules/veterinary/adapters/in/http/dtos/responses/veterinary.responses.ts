import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  PROFESSIONS,
  CREDENTIAL_STATUSES,
} from '../../../../../domain/credential';
const id = z.uuid(),
  date = z.iso.datetime();
const credential = z.strictObject({
  id,
  organizationId: id,
  professionalId: id,
  resourceId: id,
  profession: z.enum(PROFESSIONS),
  registrationNumber: z.string(),
  university: z.string(),
  consent: z.literal(true),
  version: z.number().int().positive(),
  status: z.enum(CREDENTIAL_STATUSES),
  documents: z
    .array(
      z.strictObject({
        mediaId: id,
        kind: z.enum([
          'professional_card',
          'qualification',
          'standing_certificate',
        ]),
      }),
    )
    .max(6),
  reviewedBy: id.nullable(),
  reviewedAt: date.nullable(),
  verifiedUntil: date.nullable(),
  verificationReference: z.string().nullable(),
  createdAt: date,
  updatedAt: date,
});
export class CredentialResponseDto extends createZodDto(credential) {}
export class CredentialsResponseDto extends createZodDto(
  z.strictObject({
    items: z.array(credential).max(50),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
) {}
export class CredentialAuditsDto extends createZodDto(
  z.strictObject({
    items: z
      .array(
        z.strictObject({
          id,
          credentialId: id,
          actorId: id,
          action: z.string(),
          version: z.number().int().positive(),
          snapshot: credential,
          reason: z.string(),
          requestId: z.string(),
          createdAt: date,
        }),
      )
      .max(50),
    total: z.number().int().nonnegative(),
  }),
) {}
