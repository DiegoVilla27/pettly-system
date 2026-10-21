import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  GLOBAL_ROLES,
  MEMBERSHIP_ROLES,
} from '../../../../../../../shared/domain/authorization';
import { updateProfileSchema } from '../profile.schemas';
import { changeUserStatusSchema } from './change-user-status.request';
import {
  givenNameSchema,
  lastNameSchema,
  optionalProfileShape,
} from '../../../../../../../shared/infrastructure/http/profile.schemas';
import { paginationShape } from '../../../../../../../shared/infrastructure/http/pagination.schemas';
export class ListUsersRequestDto extends createZodDto(
  z.strictObject({
    ...paginationShape,
    search: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[^\p{Cc}]+$/u)
      .optional(),
    status: z.enum(['active', 'disabled', 'deleted']).optional(),
    role: z.enum(GLOBAL_ROLES).optional(),
    organizationRole: z.enum(MEMBERSHIP_ROLES).optional(),
    emailVerified: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['createdAt', 'email', 'name']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
) {}
export class AdminUpdateUserRequestDto extends createZodDto(
  z.strictObject({
    profile: updateProfileSchema,
    reason: changeUserStatusSchema.shape.reason,
  }),
) {}
export class InviteUserRequestDto extends createZodDto(
  z.strictObject({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    name: givenNameSchema,
    lastName: lastNameSchema,
    ...optionalProfileShape,
    reason: changeUserStatusSchema.shape.reason,
  }),
) {}
export class DeleteUserRequestDto extends createZodDto(
  z.strictObject({ reason: changeUserStatusSchema.shape.reason }),
) {}

export class ResendInvitationRequestDto extends createZodDto(
  z.strictObject({ reason: changeUserStatusSchema.shape.reason }),
) {}
