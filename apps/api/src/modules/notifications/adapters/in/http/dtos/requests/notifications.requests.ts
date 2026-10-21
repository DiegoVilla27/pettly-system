import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { NOTIFICATION_CATEGORIES } from '../../../../../domain/notification';
const pagination = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};
export class NotificationsQueryDto extends createZodDto(
  z.strictObject({
    ...pagination,
    category: z.enum(NOTIFICATION_CATEGORIES).optional(),
    unreadOnly: z.enum(['true', 'false']).default('false'),
  }),
) {}
export class FailedDeliveriesQueryDto extends createZodDto(
  z.strictObject(pagination),
) {}
export class NotificationParamsDto extends createZodDto(
  z.strictObject({ notificationId: z.uuid() }),
) {}
export class DeliveryParamsDto extends createZodDto(
  z.strictObject({ deliveryId: z.uuid() }),
) {}
export class EmptyNotificationDto extends createZodDto(z.strictObject({})) {}
export class ReadAllNotificationsDto extends createZodDto(
  z.strictObject({
    through: z.iso.datetime().meta({
      description:
        'Mark only notifications created at or before this UTC timestamp. Cannot be in the future.',
    }),
  }),
) {}
export class PreferencesDto extends createZodDto(
  z.strictObject({
    expectedVersion: z.number().int().min(0).max(2147483647),
    ordersEmail: z.boolean(),
    adoptionsEmail: z.boolean(),
    bookingsEmail: z.boolean(),
  }),
) {}
export class RetryDeliveryDto extends createZodDto(
  z.strictObject({
    reason: z
      .string()
      .trim()
      .min(10)
      .max(500)
      .regex(/^[^\p{Cc}]+$/u),
  }),
) {}
