import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
const id = z.uuid(),
  date = z.iso.datetime(),
  integer = z.number().int();
export const stock = z.strictObject({
  variantId: id,
  onHand: integer.nonnegative(),
  reserved: integer.nonnegative(),
  available: integer.nonnegative(),
  version: integer.positive(),
  updatedAt: date,
});
export const hold = z.strictObject({
  orderId: id.nullable(),
  id,
  variantId: id,
  organizationId: id,
  referenceId: id,
  quantity: integer.positive(),
  status: z.enum(['active', 'released', 'consumed', 'expired']),
  expiresAt: date,
  createdAt: date,
  updatedAt: date,
});
export const movement = z.strictObject({
  id,
  variantId: id,
  organizationId: id,
  actorId: id.nullable(),
  holdId: id.nullable(),
  kind: z.enum([
    'receipt',
    'issue',
    'adjustment',
    'hold',
    'release',
    'consume',
    'expire',
  ]),
  onHandDelta: integer,
  reservedDelta: integer,
  onHandAfter: integer.nonnegative(),
  reservedAfter: integer.nonnegative(),
  versionAfter: integer.positive(),
  idempotencyKey: z.string(),
  reason: z.string(),
  requestId: id,
  createdAt: date,
});
export class StockResponseDto extends createZodDto(stock) {}
export class HoldResponseDto extends createZodDto(hold) {}
export class MovementChangeResponseDto extends createZodDto(
  z.strictObject({ stock, movement }),
) {}
export class HoldChangeResponseDto extends createZodDto(
  z.strictObject({ stock, hold }),
) {}
export class MovementsResponseDto extends createZodDto(
  z.strictObject({
    items: z.array(movement).max(100),
    total: integer.nonnegative(),
    page: integer.positive(),
    limit: integer.positive(),
  }),
) {}
export class AvailabilityResponseDto extends createZodDto(
  z.strictObject({
    items: z
      .array(
        z.strictObject({ variantId: id, available: integer.nonnegative() }),
      )
      .max(50),
  }),
) {}
