import { ApplicationError } from '../../../../shared/domain/application-error';
import type { PaymentAllocation } from '../../../../shared/domain/payment-allocation';
import {
  COUNTRY_CODES,
  PHONE_PATTERN,
} from '../../../../shared/domain/profile-details';
export interface Address {
  recipient: string;
  phone: string;
  countryCode: string;
  city: string;
  address: string;
  addressLine2: string | null;
  postalCode: string | null;
}
export interface ShippingRule {
  countryCode: string;
  city: string;
  feeMinor: number;
}
export interface CommercialPolicy {
  organizationId: string;
  currency: string;
  enabled: boolean;
  pickupAddress: Address | null;
  shippingRules: ShippingRule[];
  taxMode: 'included' | 'added';
  taxRates: Record<string, number>;
  shippingTaxBasisPoints: number;
  collector: 'seller' | 'platform';
  terms: string;
  version: number;
  updatedAt: Date;
}
export interface CheckoutLine {
  variantId: string;
  productId: string;
  productVersion: number;
  name: string;
  sku: string;
  attributes: Record<string, string>;
  quantity: number;
  unitPriceMinor: number;
  subtotalMinor: number;
  taxMinor: number;
  holdId: string;
}
export interface CheckoutSnapshot {
  commission?: PaymentAllocation;
  organizationId: string;
  currency: string;
  lines: CheckoutLine[];
  fulfillment: 'pickup' | 'delivery';
  contact: Address;
  pickupAddress: Address | null;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number | null;
  totalMinor: number;
  taxMode: 'included' | 'added';
  collector: 'seller' | 'platform';
  terms: string;
  policyVersion: number;
}
function text(value: unknown, min: number, max: number) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max ||
    /\p{Cc}/u.test(value)
  )
    throw new ApplicationError('INVALID_INPUT', 'Invalid checkout text.');
  return value.trim();
}
export function address(a: Address): Address {
  if (!COUNTRY_CODES.includes(a.countryCode) || !PHONE_PATTERN.test(a.phone))
    throw new ApplicationError(
      'INVALID_INPUT',
      'Use an ISO country and international contact phone.',
    );
  return {
    recipient: text(a.recipient, 2, 150),
    phone: a.phone,
    countryCode: a.countryCode,
    city: text(a.city, 2, 100),
    address: text(a.address, 2, 200),
    addressLine2: a.addressLine2 === null ? null : text(a.addressLine2, 1, 200),
    postalCode: a.postalCode === null ? null : text(a.postalCode, 1, 20),
  };
}
export function validatePolicy(p: CommercialPolicy) {
  if (
    !['COP', 'USD', 'EUR'].includes(p.currency) ||
    !['included', 'added'].includes(p.taxMode) ||
    !['seller', 'platform'].includes(p.collector) ||
    p.shippingRules.length > 30 ||
    Object.keys(p.taxRates).length > 50
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'Unsupported commercial policy.',
    );
  if (p.pickupAddress) address(p.pickupAddress);
  if (p.enabled && !p.pickupAddress && !p.shippingRules.length)
    throw new ApplicationError(
      'INVALID_INPUT',
      'Configure at least one delivery method.',
    );
  const cities = new Set<string>();
  for (const r of p.shippingRules) {
    const key =
      r.countryCode + ':' + text(r.city, 2, 100).toLocaleLowerCase('en');
    if (
      !COUNTRY_CODES.includes(r.countryCode) ||
      cities.has(key) ||
      !Number.isInteger(r.feeMinor) ||
      r.feeMinor < 0 ||
      r.feeMinor > 2147483647
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Invalid or duplicate shipping coverage/rate.',
      );
    cities.add(key);
  }
  for (const rate of [...Object.values(p.taxRates), p.shippingTaxBasisPoints])
    if (!Number.isInteger(rate) || rate < 0 || rate > 10000)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Explicit tax rates use integer basis points 0–10000.',
      );
  if (
    p.taxMode === 'included' &&
    (Object.keys(p.taxRates).length || p.shippingTaxBasisPoints !== 0)
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'Included-price mode cannot add extra tax.',
    );
  text(p.terms, 10, 2000);
}
export function money(value: number) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new ApplicationError(
      'INVALID_INPUT',
      'Money must fit safe integer minor units.',
    );
  return value;
}
export function tax(base: number, basisPoints: number) {
  return money(Math.floor((money(base * basisPoints) + 5000) / 10000));
}
