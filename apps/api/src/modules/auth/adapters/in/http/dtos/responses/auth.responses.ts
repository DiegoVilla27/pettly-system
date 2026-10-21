import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
export class MessageResponseDto extends createZodDto(
  z.strictObject({
    message: z.string().min(1).meta({
      description: 'English operation acknowledgement.',
      example: 'If the account is eligible, an email will be sent.',
    }),
  }),
) {}
export class AuthResponseDto extends createZodDto(
  z.strictObject({
    accessToken: z
      .string()
      .min(1)
      .meta({ description: 'Short-lived bearer JWT.' }),
    tokenType: z.literal('Bearer'),
    expiresIn: z
      .number()
      .int()
      .positive()
      .meta({ description: 'Access token lifetime in seconds.', example: 900 }),
    sessionId: z.uuid(),
    refreshToken: z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .optional()
      .meta({
        description:
          'Rotating refresh token, returned only for mobile clients.',
      }),
  }),
) {}
