import {
  object,
  strictObject,
  string,
  number,
  boolean,
  literal,
  nullable,
  optional,
  uuid,
  iso,
  array,
  refine,
  int,
  minLength,
  maxLength,
  enum as enumeration,
} from 'zod/mini';
import type { ParamMap } from '@angular/router';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import type {
  Notice,
  InboxQuery,
  Preferences,
  Delivery,
  DeliveryQuery,
} from '../models/notification';
const integer = (min: number, max = 2147483647) =>
  number().check(
    int(),
    refine((n) => n >= min && n <= max),
  );
const text = (max: number) => string().check(minLength(1), maxLength(max));
const category = enumeration([
  'orders',
  'adoptions',
  'organizations',
  'bookings',
]);
export const inboxQuerySchema = strictObject({
  page: integer(1, 10000),
  limit: integer(1, 50),
  category: optional(category),
  unreadOnly: enumeration(['true', 'false']),
});
export const deliveryQuerySchema = strictObject({
  page: integer(1, 10000),
  limit: integer(1, 50),
});
export const preferenceCommandSchema = strictObject({
  expectedVersion: integer(0),
  ordersEmail: boolean(),
  adoptionsEmail: boolean(),
  bookingsEmail: boolean(),
});
const noticeSchema = object({
  id: uuid(),
  category,
  eventType: text(60),
  subjectType: text(30),
  subjectId: uuid(),
  subjectVersion: integer(1),
  status: text(30),
  title: text(150),
  body: text(2000),
  createdAt: iso.datetime(),
  readAt: nullable(iso.datetime()),
}).check(
  refine((n) => !n.readAt || Date.parse(n.readAt) >= Date.parse(n.createdAt)),
);
const preferenceSchema = object({
  ordersEmail: boolean(),
  adoptionsEmail: boolean(),
  bookingsEmail: boolean(),
  version: integer(0),
  updatedAt: iso.datetime(),
  organizationEmailMandatory: literal(true),
  inAppMandatory: literal(true),
});
const deliverySchema = object({
  id: uuid(),
  notificationId: nullable(uuid()),
  subjectType: nullable(text(30)),
  subjectId: nullable(uuid()),
  subjectVersion: nullable(integer(1)),
  mailPurpose: nullable(text(100)),
  failureKind: nullable(text(100)),
  expiresAt: iso.datetime(),
  notBefore: iso.datetime(),
  failedAt: nullable(iso.datetime()),
  deliveredAt: nullable(iso.datetime()),
  attempts: integer(0),
  createdAt: iso.datetime(),
  retryOfId: nullable(uuid()),
});
const inboxPageSchema = object({
  items: array(noticeSchema),
  total: integer(0),
  page: integer(1, 10000),
  limit: integer(1, 50),
});
const deliveryPageSchema = object({
  items: array(deliverySchema),
  total: integer(0),
  page: integer(1, 10000),
  limit: integer(1, 50),
});
export const inputProblem = () =>
  new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa los filtros y los datos de la operación.',
  );
export const contractProblem = () =>
  new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar la respuesta. Actualiza antes de continuar.',
  );
export function mapNotice(dto: unknown, id?: string): Notice {
  const p = noticeSchema.safeParse(dto);
  if (!p.success || (id && p.data.id !== id)) throw contractProblem();
  return p.data;
}
export function mapPreferences(dto: unknown): Preferences {
  const p = preferenceSchema.safeParse(dto);
  if (!p.success) throw contractProblem();
  return p.data;
}
export function mapDelivery(dto: unknown): Delivery {
  const p = deliverySchema.safeParse(dto);
  if (!p.success) throw contractProblem();
  return p.data;
}
function validPage(
  p: { items: { id: string }[]; total: number; page: number; limit: number },
  q: DeliveryQuery,
) {
  return (
    p.page === q.page &&
    p.limit === q.limit &&
    p.items.length <= q.limit &&
    p.total >= p.items.length &&
    new Set(p.items.map((n) => n.id)).size === p.items.length
  );
}
export function mapInbox(dto: unknown, q: InboxQuery) {
  const p = inboxPageSchema.safeParse(dto);
  if (
    !p.success ||
    !validPage(p.data, q) ||
    p.data.items.some(
      (n) =>
        (q.category && n.category !== q.category) ||
        (q.unreadOnly === 'true' && n.readAt),
    )
  )
    throw contractProblem();
  return p.data;
}
export function mapDeliveries(dto: unknown, q: DeliveryQuery) {
  const p = deliveryPageSchema.safeParse(dto);
  if (!p.success || !validPage(p.data, q)) throw contractProblem();
  return p.data;
}
export function mapCount(dto: unknown) {
  const p = object({ count: integer(0) }).safeParse(dto);
  if (!p.success) throw contractProblem();
  return p.data.count;
}
export function mapReadAll(dto: unknown) {
  const p = object({ updated: integer(0) }).safeParse(dto);
  if (!p.success) throw contractProblem();
  return p.data;
}
export function parseInboxFilters(p: ParamMap): InboxQuery | null {
  const q = inboxQuerySchema.safeParse({
    page: Number(p.get('page') ?? 1),
    limit: Number(p.get('limit') ?? 20),
    unreadOnly: p.get('unreadOnly') ?? 'false',
    ...(p.get('category') ? { category: p.get('category') } : {}),
  });
  return q.success ? q.data : null;
}
export function parseDeliveryFilters(p: ParamMap): DeliveryQuery | null {
  const q = deliveryQuerySchema.safeParse({
    page: Number(p.get('page') ?? 1),
    limit: Number(p.get('limit') ?? 20),
  });
  return q.success ? q.data : null;
}
export function validRetryInput(id: string, reason: string) {
  if (!uuid().safeParse(id).success || !reasonSchema.safeParse(reason).success)
    throw inputProblem();
}
