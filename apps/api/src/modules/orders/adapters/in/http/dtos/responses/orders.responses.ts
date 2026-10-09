import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
const id = z.uuid(),
  date = z.iso.datetime(),
  int = z.number().int(),
  amount = int.min(0).max(Number.MAX_SAFE_INTEGER);
const address = z.strictObject({
  recipient: z.string(),
  phone: z.string(),
  countryCode: z.string().length(2),
  city: z.string(),
  address: z.string(),
  addressLine2: z.string().nullable(),
  postalCode: z.string().nullable(),
});
const line = z.strictObject({
  variantId: id,
  productId: id,
  productVersion: int.positive(),
  name: z.string(),
  sku: z.string(),
  attributes: z.record(z.string(), z.string()),
  quantity: int.min(1).max(99),
  unitPriceMinor: amount,
  subtotalMinor: amount,
  taxMinor: amount,
  holdId: id,
});
const snapshot = z.strictObject({
  commission: z
    .strictObject({
      policyId: z.string(),
      rateBasisPoints: int.min(0).max(10000),
      base: z.literal('product_subtotal'),
      baseMinor: amount,
      platformMinor: amount,
      sellerMinor: amount,
      totalMinor: amount,
      processingFeeBearer: z.literal('seller'),
    })
    .optional()
    .meta({
      description:
        'Immutable provider-managed split allocation before provider fees. Missing only on historical quotes/orders. Included-price taxes remain part of product subtotal.',
    }),
  organizationId: id,
  currency: z.enum(['COP', 'USD', 'EUR']),
  lines: z.array(line).min(1).max(50),
  fulfillment: z.enum(['pickup', 'delivery']),
  contact: address,
  pickupAddress: address.nullable(),
  subtotalMinor: amount,
  shippingMinor: amount,
  taxMinor: amount.nullable().meta({
    description:
      'Null when taxes are included in listed prices; otherwise explicit additional tax in minor units.',
  }),
  totalMinor: amount,
  taxMode: z.enum(['included', 'added']),
  collector: z.enum(['seller', 'platform']),
  terms: z.string(),
  policyVersion: int.positive(),
});
const order = z.strictObject({
  id,
  buyerId: id,
  organizationId: id,
  quoteId: id,
  status: z.enum([
    'awaiting_payment',
    'paid',
    'preparing',
    'dispatched',
    'ready_for_pickup',
    'delivered',
    'cancelled',
    'expired',
  ]),
  version: int.positive(),
  snapshot,
  totalMinor: amount,
  currency: z.enum(['COP', 'USD', 'EUR']),
  paymentId: id.nullable(),
  expiresAt: date,
  paidAt: date.nullable(),
  createdAt: date,
  updatedAt: date,
});
const quote = z.strictObject({
  id,
  buyerId: id,
  cartId: id,
  cartVersion: int.positive(),
  snapshot,
  expiresAt: date,
  createdAt: date,
});
const policy = z.strictObject({
  organizationId: id,
  currency: z.enum(['COP', 'USD', 'EUR']),
  enabled: z.boolean(),
  pickupAddress: address.nullable(),
  shippingRules: z
    .array(
      z.strictObject({
        countryCode: z.string(),
        city: z.string(),
        feeMinor: amount,
      }),
    )
    .max(30),
  taxMode: z.enum(['included', 'added']),
  taxRates: z.record(id, int.min(0).max(10000)),
  shippingTaxBasisPoints: int.min(0).max(10000),
  collector: z.enum(['seller', 'platform']),
  terms: z.string(),
  version: int.positive(),
  updatedAt: date,
});
const paging = {
  total: int.nonnegative(),
  page: int.positive(),
  limit: int.positive(),
};
export class OrderResponseDto extends createZodDto(order) {}
export class QuoteResponseDto extends createZodDto(quote) {}
export class PolicyResponseDto extends createZodDto(
  z.strictObject({ policy: policy.nullable() }),
) {}
export class OrdersResponseDto extends createZodDto(
  z.strictObject({ ...paging, items: z.array(order).max(50) }),
) {}
export class OrderAuditsResponseDto extends createZodDto(
  z.strictObject({
    ...paging,
    items: z
      .array(
        z.strictObject({
          id,
          orderId: id,
          version: int.positive(),
          actorId: id.nullable(),
          action: z.enum([
            'created',
            'paid',
            'preparing',
            'dispatched',
            'ready_for_pickup',
            'delivered',
            'cancelled',
            'expired',
          ]),
          reason: z.string(),
          requestId: id,
          createdAt: date,
        }),
      )
      .max(50),
  }),
) {}

export class PolicyAuditsResponseDto extends createZodDto(
  z.strictObject({
    ...paging,
    items: z
      .array(
        z.strictObject({
          id,
          organizationId: id,
          actorId: id,
          version: int.positive(),
          snapshot: policy.omit({
            organizationId: true,
            version: true,
            updatedAt: true,
          }),
          reason: z.string(),
          requestId: id,
          createdAt: date,
        }),
      )
      .max(50),
  }),
) {}
