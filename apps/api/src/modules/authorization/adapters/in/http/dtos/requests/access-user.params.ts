import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
export class AccessUserParamsDto extends createZodDto(
  z.strictObject({ userId: z.uuid() }),
) {}
