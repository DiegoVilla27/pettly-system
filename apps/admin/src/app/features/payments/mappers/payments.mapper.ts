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
  union,
  boolean,
} from 'zod/mini';
import type { ParamMap } from '@angular/router';
import { ApiProblem } from '../../../core/api';
import type {
  Payment,
  PaymentContext,
  PaymentQuery,
  PaymentPage,
  PaymentHistory,
  PaymentPolicy,
  FinancialEvidence,
  Company,
} from '../models/payment';
const integer = (min: number, max: number) =>
  number().check(
    int(),
    refine((n) => n >= min && n <= max),
  );
const money = integer(0, Number.MAX_SAFE_INTEGER);
const text = (max: number) =>
  string().check(minLength(1), maxLength(max), regex(/^[^\p{Cc}]+$/u));
const status = enumeration([
  'created',
  'processing',
  'pending',
  'approved',
  'declined',
  'cancelled',
  'expired',
  'reconciliation_required',
]);
const distribution = enumeration([
  'unconfirmed',
  'pending',
  'distributed',
  'failed',
]);
const scope = union([
  strictObject({ scope: literal('platform') }),
  strictObject({ scope: literal('business'), organizationId: uuid() }),
]);
export const contextSchema = union([
  strictObject({ scope: literal('platform'), paymentId: uuid() }),
  strictObject({
    scope: literal('business'),
    organizationId: uuid(),
    paymentId: uuid(),
  }),
]);
const paging = { page: integer(1, 10000), limit: integer(1, 50), total: money };
export const querySchema = union([
  strictObject({
    scope: literal('platform'),
    page: paging.page,
    limit: paging.limit,
    status: optional(status),
  }),
  strictObject({
    scope: literal('business'),
    organizationId: uuid(),
    page: paging.page,
    limit: paging.limit,
    status: optional(status),
  }),
]);
export const paymentSchema = object({
  id: uuid(),
  orderId: uuid(),
  buyerId: uuid(),
  organizationId: uuid(),
  provider: text(100),
  reference: nullable(text(500)),
  status,
  distributionStatus: distribution,
  allocation: object({
    policyId: text(200),
    rateBasisPoints: integer(0, 10000),
    base: literal('product_subtotal'),
    baseMinor: money,
    platformMinor: money,
    sellerMinor: money,
    totalMinor: money,
    processingFeeBearer: literal('seller'),
  }),
  amountMinor: integer(1, Number.MAX_SAFE_INTEGER),
  currency: literal('COP'),
  feeMinor: nullable(money),
  version: integer(1, 2147483647),
  expiresAt: iso.datetime(),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
}).check(
  refine((p) => {
    const a = p.allocation;
    return (
      a.totalMinor === p.amountMinor &&
      a.baseMinor <= a.totalMinor &&
      BigInt(a.platformMinor) + BigInt(a.sellerMinor) ===
        BigInt(a.totalMinor) &&
      BigInt(a.platformMinor) ===
        (BigInt(a.baseMinor) * BigInt(a.rateBasisPoints) + 5000n) / 10000n &&
      Date.parse(p.updatedAt) >= Date.parse(p.createdAt) &&
      Date.parse(p.expiresAt) > Date.parse(p.createdAt)
    );
  }),
);
export function inputProblem() {
  return new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa el ámbito, la empresa y los filtros del pago.',
  );
}
export function contractProblem() {
  return new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar la información financiera. Actualiza antes de continuar.',
  );
}
export function mapPayment(dto: unknown, c?: PaymentContext): Payment {
  const p = paymentSchema.safeParse(dto);
  if (
    !p.success ||
    (c &&
      (p.data.id !== c.paymentId ||
        (c.scope === 'business' && p.data.organizationId !== c.organizationId)))
  )
    throw contractProblem();
  return p.data;
}
export function mapPage(dto: unknown, q: PaymentQuery): PaymentPage {
  const p = object({
    ...paging,
    items: array(paymentSchema).check(maxLength(50)),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.page !== q.page ||
    p.data.limit !== q.limit ||
    p.data.items.length > q.limit ||
    p.data.total < p.data.items.length ||
    new Set(p.data.items.map((v) => v.id)).size !== p.data.items.length ||
    p.data.items.some(
      (v) =>
        (q.scope === 'business' && v.organizationId !== q.organizationId) ||
        (q.status && v.status !== q.status),
    )
  )
    throw contractProblem();
  return p.data;
}
export function mapHistory(
  dto: unknown,
  c: PaymentContext,
  page: number,
): PaymentHistory {
  const p = object({
    ...paging,
    items: array(
      object({
        id: uuid(),
        paymentId: uuid(),
        version: integer(1, 2147483647),
        action: text(100),
        actorId: nullable(uuid()),
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
    new Set(p.data.items.map((v) => v.id)).size !== p.data.items.length ||
    p.data.items.some((v) => v.paymentId !== c.paymentId)
  )
    throw contractProblem();
  return p.data;
}
export function mapFinancials(
  dto: unknown,
  c: PaymentContext,
): FinancialEvidence {
  const p = object({
    events: array(
      object({
        id: uuid(),
        paymentId: uuid(),
        provider: text(100),
        eventId: text(500),
        observation: object({
          eventId: text(500),
          reference: text(500),
          paymentId: uuid(),
          amountMinor: money,
          currency: text(20),
          status: enumeration(['pending', 'approved', 'declined', 'cancelled']),
          distributionStatus: distribution,
          feeMinor: nullable(money),
        }),
        outcome: enumeration(['applied', 'ignored', 'reconciliation_required']),
        createdAt: iso.datetime(),
      }),
    ).check(maxLength(100)),
    ledger: array(
      object({
        id: uuid(),
        paymentId: uuid(),
        eventId: uuid(),
        kind: literal('capture'),
        amountMinor: money,
        platformMinor: money,
        sellerMinor: money,
        createdAt: iso.datetime(),
      }),
    ).check(maxLength(100)),
  }).safeParse(dto);
  if (
    !p.success ||
    p.data.events.some((e) => e.paymentId !== c.paymentId) ||
    p.data.ledger.some(
      (l) =>
        l.paymentId !== c.paymentId ||
        BigInt(l.platformMinor) + BigInt(l.sellerMinor) !==
          BigInt(l.amountMinor),
    ) ||
    new Set(p.data.events.map((e) => e.id)).size !== p.data.events.length ||
    new Set(p.data.ledger.map((e) => e.id)).size !== p.data.ledger.length
  )
    throw contractProblem();
  // Mismatched observations are legitimate evidence, not accepted payment amounts.
  return p.data;
}
export function mapPolicy(dto: unknown): PaymentPolicy {
  const p = object({
    rateBasisPoints: integer(0, 10000),
    percent: number().check(refine((n) => n >= 0 && n <= 100)),
    base: literal('product_subtotal'),
    processingFeeBearer: literal('seller'),
    provider: text(100),
    providerEnabled: boolean(),
  }).safeParse(dto);
  if (!p.success || p.data.percent !== p.data.rateBasisPoints / 100)
    throw contractProblem();
  return p.data;
}
export function mapCompany(dto: unknown): Company {
  const p = object({
    id: uuid(),
    name: text(150),
    type: literal('business'),
    status: literal('active'),
  }).safeParse(dto);
  if (!p.success) throw contractProblem();
  return { id: p.data.id, name: p.data.name };
}
export function parseFilters(
  p: ParamMap,
  platform: boolean,
): PaymentQuery | null {
  const selected = p.get('scope') ?? (platform ? 'platform' : 'business');
  if (selected === 'platform' && p.has('organizationId')) return null;
  const s = scope.safeParse(
    selected === 'platform'
      ? { scope: selected }
      : { scope: selected, organizationId: p.get('organizationId') ?? '' },
  );
  if (!s.success) return null;
  const q = querySchema.safeParse({
    ...s.data,
    page: Number(p.get('page') ?? 1),
    limit: Number(p.get('limit') ?? 20),
    status: p.get('status') || undefined,
  });
  return q.success ? q.data : null;
}
