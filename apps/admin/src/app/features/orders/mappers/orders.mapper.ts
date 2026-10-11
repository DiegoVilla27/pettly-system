import {
  object,
  strictObject,
  string,
  number,
  int,
  refine,
  minLength,
  maxLength,
  regex,
  enum as enumeration,
  literal,
  nullable,
  optional,
  uuid,
  iso,
  array,
  record,
} from 'zod/mini';
import type { ParamMap } from '@angular/router';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import type { Order, OrderQuery, OrderContext, Company } from '../models/order';
const integer = (min: number, max: number) =>
  number().check(
    int(),
    refine((n) => n >= min && n <= max),
  );
export const version = integer(1, 2147483647);
const money = integer(0, Number.MAX_SAFE_INTEGER);
const text = (min: number, max: number) =>
  string().check(minLength(min), maxLength(max), regex(/^[^\p{Cc}]+$/u));
const status = enumeration([
  'awaiting_payment',
  'paid',
  'preparing',
  'dispatched',
  'ready_for_pickup',
  'delivered',
  'cancelled',
  'expired',
]);
const currency = enumeration(['COP', 'USD', 'EUR']);
const address = object({
  recipient: text(2, 150),
  phone: text(8, 16),
  countryCode: string().check(minLength(2), maxLength(2)),
  city: text(2, 100),
  address: text(2, 200),
  addressLine2: nullable(text(1, 200)),
  postalCode: nullable(text(1, 20)),
});
const commission = object({
  policyId: text(1, 200),
  rateBasisPoints: integer(0, 10000),
  base: literal('product_subtotal'),
  baseMinor: money,
  platformMinor: money,
  sellerMinor: money,
  totalMinor: money,
  processingFeeBearer: literal('seller'),
});
// Projection deliberately omits internal hold IDs, collector metadata and quote identity.
export const orderSchema = object({
  id: uuid(),
  buyerId: uuid(),
  organizationId: uuid(),
  status,
  version,
  snapshot: object({
    organizationId: uuid(),
    currency,
    lines: array(
      object({
        variantId: uuid(),
        productId: uuid(),
        productVersion: version,
        name: text(1, 150),
        sku: text(1, 100),
        attributes: record(string(), string()),
        quantity: integer(1, 99),
        unitPriceMinor: money,
        subtotalMinor: money,
        taxMinor: money,
      }),
    ).check(minLength(1), maxLength(50)),
    fulfillment: enumeration(['pickup', 'delivery']),
    contact: address,
    pickupAddress: nullable(address),
    subtotalMinor: money,
    shippingMinor: money,
    taxMinor: nullable(money),
    totalMinor: money,
    taxMode: enumeration(['included', 'added']),
    terms: text(10, 2000),
    policyVersion: version,
    commission: optional(commission),
  }),
  totalMinor: money,
  currency,
  paymentId: nullable(uuid()),
  expiresAt: iso.datetime(),
  paidAt: nullable(iso.datetime()),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
}).check(
  refine((o) => {
    const s = o.snapshot,
      c = s.commission,
      paid = [
        'paid',
        'preparing',
        'dispatched',
        'ready_for_pickup',
        'delivered',
      ].includes(o.status);
    return (
      o.organizationId === s.organizationId &&
      o.currency === s.currency &&
      o.totalMinor === s.totalMinor &&
      s.totalMinor === s.subtotalMinor + s.shippingMinor + (s.taxMinor ?? 0) &&
      BigInt(s.subtotalMinor) ===
        s.lines.reduce((sum, l) => sum + BigInt(l.subtotalMinor), 0n) &&
      s.lines.every(
        (l) =>
          BigInt(l.subtotalMinor) ===
          BigInt(l.unitPriceMinor) * BigInt(l.quantity),
      ) &&
      new Set(s.lines.map((l) => l.variantId)).size === s.lines.length &&
      (s.taxMode === 'included'
        ? s.taxMinor === null && s.lines.every((l) => l.taxMinor === 0)
        : s.taxMinor !== null) &&
      (s.fulfillment !== 'pickup' || s.pickupAddress !== null) &&
      (o.status !== 'dispatched' || s.fulfillment === 'delivery') &&
      (o.status !== 'ready_for_pickup' || s.fulfillment === 'pickup') &&
      paid === (o.paymentId !== null && o.paidAt !== null) &&
      (paid || (o.paymentId === null && o.paidAt === null)) &&
      Date.parse(o.updatedAt) >= Date.parse(o.createdAt) &&
      Date.parse(o.expiresAt) > Date.parse(o.createdAt) &&
      (!o.paidAt ||
        (Date.parse(o.paidAt) >= Date.parse(o.createdAt) &&
          Date.parse(o.paidAt) < Date.parse(o.expiresAt))) &&
      (!c ||
        (c.totalMinor === o.totalMinor &&
          c.baseMinor === s.subtotalMinor &&
          BigInt(c.platformMinor) + BigInt(c.sellerMinor) ===
            BigInt(c.totalMinor) &&
          BigInt(c.platformMinor) ===
            (BigInt(c.baseMinor) * BigInt(c.rateBasisPoints) + 5000n) / 10000n))
    );
  }),
);
export const contextSchema = strictObject({
  organizationId: uuid(),
  orderId: uuid(),
});
export const querySchema = strictObject({
  organizationId: uuid(),
  page: integer(1, 10000),
  limit: integer(1, 50),
  status: optional(status),
  search: optional(text(2, 100)),
});
export const decisionSchema = strictObject({
  expectedVersion: version,
  reason: reasonSchema,
});
export function inputProblem() {
  return new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa los filtros, la acción y el motivo del pedido.',
  );
}
export function contractProblem() {
  return new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar el pedido. Actualiza antes de continuar.',
  );
}
export function mapOrder(dto: unknown, c?: OrderContext): Order {
  const p = orderSchema.safeParse(dto);
  if (
    !p.success ||
    (c &&
      (p.data.id !== c.orderId || p.data.organizationId !== c.organizationId))
  )
    throw contractProblem();
  return p.data;
}
const paging = {
  total: integer(0, Number.MAX_SAFE_INTEGER),
  page: integer(1, 10000),
  limit: integer(1, 50),
};
export function mapPage(dto: unknown, q: OrderQuery) {
  const p = object({
    ...paging,
    items: array(orderSchema).check(maxLength(50)),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.page !== q.page ||
    p.data.limit !== q.limit ||
    p.data.items.length > q.limit ||
    p.data.total < p.data.items.length ||
    new Set(p.data.items.map((o) => o.id)).size !== p.data.items.length ||
    p.data.items.some(
      (o) =>
        o.organizationId !== q.organizationId ||
        (q.status && o.status !== q.status),
    )
  )
    throw contractProblem();
  return p.data;
}
export function mapAudit(dto: unknown, c: OrderContext, page: number) {
  const p = object({
    ...paging,
    items: array(
      object({
        id: uuid(),
        orderId: uuid(),
        version,
        actorId: nullable(uuid()),
        action: enumeration([
          'created',
          'paid',
          'preparing',
          'dispatched',
          'ready_for_pickup',
          'delivered',
          'cancelled',
          'expired',
        ]),
        reason: string().check(maxLength(500)),
        requestId: uuid(),
        createdAt: iso.datetime(),
      }),
    ).check(maxLength(20)),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.page !== page ||
    p.data.limit !== 20 ||
    p.data.total < p.data.items.length ||
    new Set(p.data.items.map((a) => a.id)).size !== p.data.items.length ||
    p.data.items.some((a) => a.orderId !== c.orderId)
  )
    throw contractProblem();
  return p.data;
}
export function mapCompany(dto: unknown): Company {
  const p = object({
    id: uuid(),
    name: text(2, 150),
    type: literal('business'),
    status: literal('active'),
  }).safeParse(dto);
  if (!p.success) throw contractProblem();
  return { id: p.data.id, name: p.data.name };
}
export function parseFilters(p: ParamMap): OrderQuery | null {
  const r = querySchema.safeParse({
    organizationId: p.get('organizationId') ?? '',
    page: Number(p.get('page') ?? 1),
    limit: Number(p.get('limit') ?? 20),
    status: p.get('status') || undefined,
    search: p.get('search') || undefined,
  });
  return r.success ? r.data : null;
}
