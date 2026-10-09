import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  PAYMENT_STATUSES,
  DISTRIBUTION_STATUSES,
} from '../../../../../domain/aggregates/payment';
const id = z.uuid(),
  date = z.iso.datetime(),
  amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const allocation = z.strictObject({
  policyId: z.string(),
  rateBasisPoints: z.number().int().min(0).max(10000),
  base: z.literal('product_subtotal'),
  baseMinor: amount,
  platformMinor: amount,
  sellerMinor: amount,
  totalMinor: amount,
  processingFeeBearer: z.literal('seller'),
});
const payment = z.strictObject({
  id,
  orderId: id,
  buyerId: id,
  organizationId: id,
  provider: z.string(),
  reference: z.string().nullable(),
  checkoutUrl: z.url().nullable().meta({
    description:
      'Null until a configured provider creates a checkout. Never a locally simulated payment URL.',
  }),
  status: z.enum(PAYMENT_STATUSES),
  distributionStatus: z.enum(DISTRIBUTION_STATUSES).meta({
    description:
      'Provider-confirmed seller distribution is separate from buyer approval.',
  }),
  allocation,
  amountMinor: amount,
  currency: z.literal('COP'),
  feeMinor: amount.nullable().meta({
    description:
      'Actual processing charge reported by provider; null means unknown, not zero.',
  }),
  version: z.number().int().positive(),
  expiresAt: date,
  createdAt: date,
  updatedAt: date,
});
const paging = {
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
};
export class PaymentResponseDto extends createZodDto(payment) {}
export class PaymentsResponseDto extends createZodDto(
  z.strictObject({ ...paging, items: z.array(payment).max(50) }),
) {}
export class PaymentPolicyResponseDto extends createZodDto(
  z.strictObject({
    rateBasisPoints: z.number().int().min(0).max(10000),
    percent: z.number().min(0).max(100),
    base: z.literal('product_subtotal'),
    processingFeeBearer: z.literal('seller'),
    provider: z.string(),
    providerEnabled: z.boolean(),
  }),
) {}
export class PaymentHistoryResponseDto extends createZodDto(
  z.strictObject({
    ...paging,
    items: z
      .array(
        z.strictObject({
          id,
          paymentId: id,
          version: z.number().int().positive(),
          action: z.string(),
          actorId: id.nullable(),
          requestId: id,
          createdAt: date,
        }),
      )
      .max(50),
  }),
) {}
const observation = z.strictObject({
  eventId: z.string(),
  reference: z.string(),
  paymentId: id,
  amountMinor: amount,
  currency: z.string(),
  status: z.enum(['pending', 'approved', 'declined', 'cancelled']),
  distributionStatus: z.enum(DISTRIBUTION_STATUSES),
  feeMinor: amount.nullable(),
});
export class PaymentFinancialsResponseDto extends createZodDto(
  z.strictObject({
    events: z
      .array(
        z.strictObject({
          id,
          paymentId: id,
          provider: z.string(),
          eventId: z.string(),
          observation,
          outcome: z.enum(['applied', 'ignored', 'reconciliation_required']),
          createdAt: date,
        }),
      )
      .max(100),
    ledger: z
      .array(
        z.strictObject({
          id,
          paymentId: id,
          eventId: id,
          kind: z.literal('capture'),
          amountMinor: amount,
          platformMinor: amount,
          sellerMinor: amount,
          createdAt: date,
        }),
      )
      .max(100),
  }),
) {}
