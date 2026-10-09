import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  COUNTRY_CODES,
  PHONE_PATTERN,
} from '../../../../../../../shared/domain/profile-details';
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^[^\p{Cc}]+$/u);
const reason = text(10, 500).meta({
    description: 'Mandatory audit justification.',
  }),
  version = z.number().int().min(1).max(2147483647);
const address = z.strictObject({
  recipient: text(2, 150),
  phone: z.string().regex(PHONE_PATTERN).meta({
    example: '+573001234567',
    description: 'International E.164 contact phone.',
  }),
  countryCode: z
    .string()
    .length(2)
    .refine((v) => COUNTRY_CODES.includes(v))
    .meta({ example: 'CO', description: 'ISO 3166-1 alpha-2 country.' }),
  city: text(2, 100),
  address: text(2, 200),
  addressLine2: text(1, 200).nullable().default(null),
  postalCode: text(1, 20).nullable().default(null),
});
export class PolicyParamsDto extends createZodDto(
  z.strictObject({ organizationId: z.uuid() }),
) {}
export class OrderParamsDto extends createZodDto(
  z.strictObject({ orderId: z.uuid() }),
) {}
export class QuoteParamsDto extends createZodDto(
  z.strictObject({ quoteId: z.uuid() }),
) {}
export class ConfigurePolicyDto extends createZodDto(
  z.strictObject({
    expectedVersion: z.number().int().min(0).max(2147483647).meta({
      description:
        'Use zero for the first configuration, otherwise the current policy version.',
    }),
    reason,
    currency: z.enum(['COP', 'USD', 'EUR']),
    enabled: z.boolean(),
    pickupAddress: address.nullable(),
    shippingRules: z
      .array(
        z.strictObject({
          countryCode: z
            .string()
            .length(2)
            .refine((v) => COUNTRY_CODES.includes(v)),
          city: text(2, 100),
          feeMinor: z.number().int().min(0).max(2147483647),
        }),
      )
      .max(30),
    taxMode: z.enum(['included', 'added']).meta({
      description:
        'Included prices add no extra tax; added mode requires explicit basis points for every purchased variant. Pettly does not infer jurisdiction tax rates.',
    }),
    taxRates: z
      .record(z.uuid(), z.number().int().min(0).max(10000))
      .refine((v) => Object.keys(v).length <= 50),
    shippingTaxBasisPoints: z.number().int().min(0).max(10000),
    collector: z.enum(['seller', 'platform']).meta({
      description:
        'Agreed future payment beneficiary. This configuration does not enable charges or an external payment integration.',
    }),
    terms: text(10, 2000),
  }),
) {}
export class QuoteRequestDto extends createZodDto(
  z.strictObject({
    expectedCartVersion: version,
    fulfillment: z.enum(['pickup', 'delivery']),
    contact: address,
  }),
) {}
export class CreateOrderDto extends createZodDto(
  z.strictObject({
    quoteId: z.uuid(),
    expectedTotalMinor: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    consent: z.literal(true).meta({
      description:
        'Accept the exact quote total, products, delivery conditions and commercial terms.',
    }),
    idempotencyKey: z.uuid().meta({
      description:
        'Durable buyer-scoped retry key. Identical retries return the same order; different content returns 409.',
    }),
  }),
) {}
export class CancelOrderDto extends createZodDto(
  z.strictObject({ expectedVersion: version, reason }),
) {}
export class FulfillOrderDto extends createZodDto(
  z.strictObject({
    expectedVersion: version,
    reason,
    status: z.enum([
      'preparing',
      'dispatched',
      'ready_for_pickup',
      'delivered',
    ]),
  }),
) {}
const pagination = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};
export class OrdersPaginationDto extends createZodDto(
  z.strictObject(pagination),
) {}
export class ListOrdersDto extends createZodDto(
  z.strictObject({
    ...pagination,
    organizationId: z.uuid().optional(),
    status: z
      .enum([
        'awaiting_payment',
        'paid',
        'preparing',
        'dispatched',
        'ready_for_pickup',
        'delivered',
        'cancelled',
        'expired',
      ])
      .optional(),
  }),
) {}
