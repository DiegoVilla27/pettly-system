import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { NOTIFICATION_CATEGORIES } from '../../../../../domain/notification';
const id = z.uuid(),
  date = z.iso.datetime(),
  integer = z.number().int();
const notification = z.strictObject({
  id,
  category: z.enum(NOTIFICATION_CATEGORIES),
  eventType: z.string(),
  subjectType: z.string(),
  subjectId: id,
  subjectVersion: integer.positive(),
  status: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: date,
  readAt: date.nullable(),
});
export class InboxNotificationDto extends createZodDto(notification) {}
export class InboxNotificationsDto extends createZodDto(
  z.strictObject({
    items: z.array(notification).max(50),
    total: integer.nonnegative(),
    page: integer.positive(),
    limit: integer.positive(),
  }),
) {}
export class UnreadNotificationsDto extends createZodDto(
  z.strictObject({ count: integer.nonnegative() }),
) {}
export class ReadAllNotificationsResponseDto extends createZodDto(
  z.strictObject({ updated: integer.nonnegative() }),
) {}
export class NotificationPreferencesDto extends createZodDto(
  z.strictObject({
    ordersEmail: z.boolean(),
    adoptionsEmail: z.boolean(),
    bookingsEmail: z.boolean(),
    organizationEmailMandatory: z.literal(true),
    inAppMandatory: z.literal(true),
    version: integer.nonnegative(),
    updatedAt: date,
  }),
) {}
const delivery = z.strictObject({
  id,
  notificationId: id.nullable(),
  subjectType: z.string().nullable(),
  subjectId: id.nullable(),
  subjectVersion: integer.positive().nullable(),
  mailPurpose: z.string().nullable(),
  failureKind: z.string().nullable(),
  expiresAt: date,
  notBefore: date,
  failedAt: date.nullable(),
  deliveredAt: date.nullable(),
  attempts: integer.nonnegative(),
  createdAt: date,
  retryOfId: id.nullable(),
});
export class NotificationDeliveryDto extends createZodDto(delivery) {}
export class FailedNotificationDeliveriesDto extends createZodDto(
  z.strictObject({
    items: z.array(delivery).max(50),
    total: integer.nonnegative(),
    page: integer.positive(),
    limit: integer.positive(),
  }),
) {}
