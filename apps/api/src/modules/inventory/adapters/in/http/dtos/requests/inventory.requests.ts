import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
const reason = z
  .string()
  .trim()
  .min(10)
  .max(500)
  .regex(/^[^\p{Cc}]+$/u)
  .meta({
    description: 'Audited operation justification.',
    example: 'Warehouse stock verified by the operator.',
  });
const base = {
  reason,
  expectedVersion: z.number().int().min(1).max(2147483647),
  idempotencyKey: z.uuid().meta({
    description:
      'Unique command UUID within this organization. Retry the identical body safely; different content returns 409.',
  }),
};
export class StockMovementDto extends createZodDto(
  z
    .strictObject({
      ...base,
      kind: z.enum(['receipt', 'issue', 'adjustment']),
      quantity: z
        .number()
        .int()
        .min(-1000000)
        .max(1000000)
        .refine((n) => n !== 0),
    })
    .refine((v) => v.kind === 'adjustment' || v.quantity > 0, {
      message:
        'Receipts/issues require a positive quantity; adjustments are signed deltas.',
    }),
) {}
export class CreateHoldDto extends createZodDto(
  z.strictObject({
    ...base,
    quantity: z.number().int().min(1).max(1000000),
    referenceId: z.uuid().meta({
      description:
        'Business operation reference. This is not an order or payment identifier validated by an implemented Orders module.',
    }),
    expiresAt: z.iso.datetime().meta({
      description: 'UTC deadline after now and at most thirty minutes ahead.',
    }),
  }),
) {}
export class HoldDecisionDto extends createZodDto(z.strictObject(base)) {}
export class StockParamsDto extends createZodDto(
  z.strictObject({ variantId: z.uuid() }),
) {}
export class HoldParamsDto extends createZodDto(
  z.strictObject({ holdId: z.uuid() }),
) {}
export class InventoryPaginationDto extends createZodDto(
  z.strictObject({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
) {}
export class AvailabilityQueryDto extends createZodDto(
  z.strictObject({
    variantIds: z
      .string()
      .max(1849)
      .transform((s) => s.split(','))
      .pipe(z.array(z.uuid()).min(1).max(50))
      .meta({
        description:
          'Comma-separated variant UUIDs; maximum fifty. Unavailable products are omitted.',
      }),
  }),
) {}
