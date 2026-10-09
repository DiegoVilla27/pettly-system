import { ApplicationError } from './application-error';

/** Immutable commercial allocation; provider deductions are tracked separately. */
export interface PaymentAllocation {
  policyId: string;
  rateBasisPoints: number;
  base: 'product_subtotal';
  baseMinor: number;
  platformMinor: number;
  sellerMinor: number;
  totalMinor: number;
  processingFeeBearer: 'seller';
}
export function percentageToBasisPoints(value: string): number {
  if (!/^(?:\d{1,3})(?:\.\d{1,2})?$/.test(value))
    throw new ApplicationError(
      'INVALID_INPUT',
      'Commission percentage must be from 0 to 100 with at most two decimals.',
    );
  const [whole, decimal = ''] = value.split('.');
  const rate = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (rate > 10000)
    throw new ApplicationError(
      'INVALID_INPUT',
      'Commission percentage must not exceed 100.',
    );
  return rate;
}
export function allocatePayment(
  baseMinor: number,
  totalMinor: number,
  rateBasisPoints: number,
): PaymentAllocation {
  if (
    ![baseMinor, totalMinor, rateBasisPoints].every(Number.isSafeInteger) ||
    baseMinor < 0 ||
    totalMinor < 1 ||
    baseMinor > totalMinor ||
    rateBasisPoints < 0 ||
    rateBasisPoints > 10000
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'Invalid payment allocation amounts or commission rate.',
    );
  const platformMinor = Number(
    (BigInt(baseMinor) * BigInt(rateBasisPoints) + 5000n) / 10000n,
  );
  return {
    policyId: `product-subtotal-v1:${rateBasisPoints}`,
    rateBasisPoints,
    base: 'product_subtotal',
    baseMinor,
    platformMinor,
    sellerMinor: totalMinor - platformMinor,
    totalMinor,
    processingFeeBearer: 'seller',
  };
}
export function validateAllocation(a: PaymentAllocation) {
  const expected = allocatePayment(
    a.baseMinor,
    a.totalMinor,
    a.rateBasisPoints,
  );
  if (
    Object.keys(expected).some(
      (k) =>
        expected[k as keyof PaymentAllocation] !==
        a[k as keyof PaymentAllocation],
    )
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'Payment allocation does not match its immutable policy.',
    );
}
