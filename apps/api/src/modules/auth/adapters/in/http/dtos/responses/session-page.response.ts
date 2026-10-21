import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
export class SessionPageResponseDto extends createZodDto(
  z.strictObject({
    items: z.array(
      z.strictObject({
        id: z.uuid(),
        createdAt: z.iso.datetime(),
        expiresAt: z.iso.datetime(),
        current: z.boolean(),
      }),
    ),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
) {}
