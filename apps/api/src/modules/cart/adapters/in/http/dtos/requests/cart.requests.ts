import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
const version = z.number().int().min(1).max(2147483647).meta({
  description: 'Version from the current own cart. Stale commands return 409.',
});
export class CartVersionDto extends createZodDto(
  z.strictObject({ expectedVersion: version }),
) {}
export class PutCartItemDto extends createZodDto(
  z.strictObject({
    expectedVersion: version,
    quantity: z.number().int().min(1).max(99).meta({
      description:
        'Absolute quantity, not an increment. Adding to the cart never reserves stock.',
    }),
  }),
) {}
export class CartItemParamsDto extends createZodDto(
  z.strictObject({ variantId: z.uuid() }),
) {}
