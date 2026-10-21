import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
const id = z.uuid();
export class CartResponseDto extends createZodDto(
  z.strictObject({
    id,
    userId: id,
    organizationId: id.nullable(),
    currency: z.enum(['COP', 'USD', 'EUR']).nullable(),
    items: z
      .array(
        z.strictObject({
          variantId: id,
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .max(50),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    current: z
      .array(
        z.strictObject({
          id,
          productId: id,
          organizationId: id,
          currency: z.enum(['COP', 'USD', 'EUR']),
          name: z.string(),
          sku: z.string(),
          priceMinor: z.number().int().positive(),
          attributes: z.record(z.string(), z.string()),
          productVersion: z.number().int().positive(),
        }),
      )
      .max(50)
      .meta({
        description:
          'Current purchasable variant details. Unavailable cart lines remain in items but are omitted here; checkout revalidates every line.',
      }),
  }),
) {}
