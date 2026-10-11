import {
  object,
  strictObject,
  string,
  uuid,
  array,
  number,
  int,
  nonnegative,
  maxLength,
  minLength,
  regex,
  nullable,
  boolean,
  iso,
  record,
  refine,
  enum as enumeration,
} from 'zod/mini';
import type { Policy, PolicyRequest, Audit } from '../models/commercial';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import { ApiProblem } from '../../../core/api';
import { copToMinor } from '../../../shared/forms/minor-money';
export const text = (max: number, min = 1) =>
  string().check(minLength(min), maxLength(max), regex(/^[^\p{Cc}]+$/u));
const amount = number().check(
  int(),
  nonnegative(),
  refine((v) => v <= 2147483647),
);
const rate = number().check(
  int(),
  nonnegative(),
  refine((v) => v <= 10000),
);
const address = object({
  recipient: text(150, 2),
  phone: string().check(regex(/^\+[1-9]\d{6,14}$/)),
  countryCode: string(),
  city: text(100, 2),
  address: text(200, 2),
  addressLine2: nullable(text(200)),
  postalCode: nullable(text(20)),
});
const data = {
  currency: enumeration(['COP', 'USD', 'EUR']),
  enabled: boolean(),
  pickupAddress: nullable(address),
  shippingRules: array(
    object({ countryCode: string(), city: text(100, 2), feeMinor: amount }),
  ).check(maxLength(30)),
  taxMode: enumeration(['included', 'added']),
  taxRates: record(uuid(), rate).check(
    refine((v) => Object.keys(v).length <= 50),
  ),
  shippingTaxBasisPoints: rate,
  collector: enumeration(['seller', 'platform']),
  terms: text(2000, 10),
};
export const requestSchema = strictObject({
  ...data,
  reason: reasonSchema,
  expectedVersion: number().check(
    int(),
    nonnegative(),
    refine((v) => v <= 2147483647),
  ),
});
export const policySchema = object({
  ...data,
  organizationId: uuid(),
  version: number().check(
    int(),
    refine((v) => v > 0),
  ),
  updatedAt: iso.datetime(),
});
export const invalid = () =>
  new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa las condiciones comerciales y el motivo.',
  );
const contract = () =>
  new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar las condiciones comerciales. Actualiza antes de continuar.',
  );
export function mapPolicy(dto: unknown, id: string): Policy | null {
  const result = object({ policy: nullable(policySchema) }).safeParse(dto);
  if (
    !result.success ||
    (result.data.policy && result.data.policy.organizationId !== id)
  )
    throw contract();
  return result.data.policy;
}
export function validateRequest(body: PolicyRequest) {
  const result = requestSchema.safeParse(body);
  if (
    !result.success ||
    (body.enabled && !body.pickupAddress && !body.shippingRules.length) ||
    (body.taxMode === 'included' &&
      (Object.keys(body.taxRates).length > 0 ||
        body.shippingTaxBasisPoints !== 0)) ||
    body.currency !== 'COP' ||
    body.collector !== 'platform' ||
    (body.pickupAddress && body.pickupAddress.countryCode !== 'CO') ||
    body.shippingRules.some((r) => r.countryCode !== 'CO') ||
    new Set(body.shippingRules.map((r) => r.city.trim().toLowerCase())).size !==
      body.shippingRules.length
  )
    throw invalid();
  return result.data;
}
export function mapAudit(dto: Audit, id: string, page: number) {
  const result = object({
    items: array(
      object({
        id: uuid(),
        organizationId: uuid(),
        actorId: uuid(),
        version: number().check(
          int(),
          refine((v) => v > 0),
        ),
        snapshot: object(data),
        reason: reasonSchema,
        requestId: text(100),
        createdAt: iso.datetime(),
      }),
    ).check(maxLength(20)),
    total: number().check(int(), nonnegative()),
    page: number(),
    limit: number(),
  }).safeParse(dto);
  if (
    !result.success ||
    result.data.page !== page ||
    result.data.limit !== 20 ||
    result.data.total < result.data.items.length ||
    result.data.items.some((e) => e.organizationId !== id)
  )
    throw contract();
  return result.data;
}
export function decimalAmount(value: string): number | null {
  return (
    copToMinor(value) ?? (/^0+(?:[.,]0{1,2})?$/.test(value.trim()) ? 0 : null)
  );
}
export function percentToBasis(value: string): number | null {
  const n = decimalAmount(value);
  return n !== null && n <= 10000 ? n : null;
}
