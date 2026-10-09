import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { userResponseSchema } from '../profile.schemas';
export class UserPageResponseDto extends createZodDto(
  z.strictObject({
    items: z.array(userResponseSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
  }),
) {}
