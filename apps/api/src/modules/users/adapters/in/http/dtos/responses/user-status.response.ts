import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
export class UserStatusResponseDto extends createZodDto(
  z.strictObject({
    id: z.uuid(),
    status: z.enum(['active', 'disabled']),
    updatedAt: z.iso.datetime(),
  }),
) {}
