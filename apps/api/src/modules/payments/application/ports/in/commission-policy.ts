import type { PaymentAllocation } from '../../../../../shared/domain/payment-allocation';
export interface CommissionPolicy {
  allocate(productSubtotalMinor: number, totalMinor: number): PaymentAllocation;
  basisPoints(): number;
}
export const COMMISSION_POLICY = Symbol('COMMISSION_POLICY');
