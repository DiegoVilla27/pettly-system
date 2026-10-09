import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
export class UserIdParamsDto extends createZodDto(
  z.strictObject({
    userId: z
      .uuid()
      .meta({ description: 'UUID of the account to administer.' }),
  }),
) {}
export const changeUserStatusSchema = z.strictObject({
  status: z.enum(['active', 'disabled']).meta({
    description:
      'Desired account state. Disabling immediately revokes every session.',
    example: 'disabled',
  }),
  reason: z
    .string()
    .trim()
    .min(10)
    .max(500)
    .regex(/^[^\p{Cc}]+$/u)
    .meta({
      description:
        'Required administrative justification recorded in the audit trail. Avoid unnecessary personal data.',
      example: 'Account suspended after reviewing repeated abuse reports.',
    }),
});
export class ChangeUserStatusRequestDto extends createZodDto(
  changeUserStatusSchema,
) {}
