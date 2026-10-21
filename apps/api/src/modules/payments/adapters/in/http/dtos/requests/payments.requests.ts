import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PAYMENT_STATUSES } from '../../../../../domain/aggregates/payment';
export class PaymentParamsDto extends createZodDto(
  z.strictObject({ paymentId: z.uuid() }),
) {}
export class PaymentOrderParamsDto extends createZodDto(
  z.strictObject({ orderId: z.uuid() }),
) {}
export class CreatePaymentDto extends createZodDto(
  z.strictObject({
    idempotencyKey: z.uuid().meta({
      description:
        'Durable buyer-scoped retry key. Amounts, commission, recipients and status are calculated exclusively by the server.',
    }),
  }),
) {}
export class ReconcilePaymentDto extends createZodDto(z.strictObject({})) {}
const pagination = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};
export class PaymentsPaginationDto extends createZodDto(
  z.strictObject(pagination),
) {}
export class ListPaymentsDto extends createZodDto(
  z.strictObject({
    ...pagination,
    organizationId: z.uuid().optional(),
    scope: z.enum(['own', 'platform']).default('own'),
    status: z.enum(PAYMENT_STATUSES).optional(),
  }),
) {}
