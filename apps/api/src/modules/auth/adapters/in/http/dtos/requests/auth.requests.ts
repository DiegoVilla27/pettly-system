import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  givenNameSchema,
  lastNameSchema,
  optionalProfileShape,
} from '../../../../../../../shared/infrastructure/http/profile.schemas';
export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254))
  .meta({
    description: 'Unique email address; trimmed and normalized to lowercase.',
    example: 'alex@example.com',
  });
export const password = z.string().min(12).max(128).meta({
  description:
    'Password, 12 to 128 characters; never trimmed, returned or logged.',
  example: 'A-long-unique-password',
});
export const token = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/)
  .meta({
    description: 'Single-use 256-bit opaque action token from the email link.',
    example: 'A'.repeat(43),
  });
export class EmailRequestDto extends createZodDto(z.strictObject({ email })) {}
export class RegisterRequestDto extends createZodDto(
  z.strictObject({
    email,
    name: givenNameSchema,
    lastName: lastNameSchema,
    password,
    ...optionalProfileShape,
  }),
) {}
export class LoginRequestDto extends createZodDto(
  z.strictObject({
    email,
    password: z.string().min(1).max(128).meta({
      description: 'Account password.',
      example: 'A-long-unique-password',
    }),
    client: z.enum(['web', 'mobile']).optional().meta({
      description:
        'Defaults to web (HttpOnly refresh cookie). Mobile receives refreshToken in JSON.',
      default: 'web',
    }),
  }),
) {}
export class ActionTokenRequestDto extends createZodDto(
  z.strictObject({ token }),
) {}
export class ResetPasswordRequestDto extends createZodDto(
  z.strictObject({ token, password }),
) {}
export class RefreshRequestDto extends createZodDto(
  z.strictObject({
    refreshToken: token.optional().meta({
      description: 'Mobile refresh token; omit when using the web cookie.',
    }),
  }),
) {}
