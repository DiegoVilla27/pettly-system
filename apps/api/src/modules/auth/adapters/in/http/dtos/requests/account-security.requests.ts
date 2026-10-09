import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { email, password, token } from './auth.requests';
import { administrativeReasonSchema } from '../../../../../../../shared/infrastructure/http/administrative-reason.schema';
const currentPassword = z.string().min(1).max(128).meta({
  description: 'Current account password. Never trimmed or returned.',
  example: 'A-long-unique-password',
});
export class ChangePasswordRequestDto extends createZodDto(
  z.strictObject({ currentPassword, newPassword: password }),
) {}
export class ChangeEmailRequestDto extends createZodDto(
  z.strictObject({ password: currentPassword, email }),
) {}
export class AcceptInvitationRequestDto extends createZodDto(
  z.strictObject({ token, password }),
) {}
export class DeleteAccountRequestDto extends createZodDto(
  z.strictObject({
    password: currentPassword,
    reason: administrativeReasonSchema,
  }),
) {}
export class SessionIdParamsDto extends createZodDto(
  z.strictObject({
    sessionId: z
      .uuid()
      .meta({ description: 'UUID of a session owned by the current account.' }),
  }),
) {}
