import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
export const paginationShape = {
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .default(1)
    .meta({ description: 'One-based page number.', example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .meta({ description: 'Page size, from 1 to 100.', example: 20 }),
};
export class PaginationRequestDto extends createZodDto(
  z.strictObject(paginationShape),
) {}
