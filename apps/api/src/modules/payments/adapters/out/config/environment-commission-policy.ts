import {
  allocatePayment,
  percentageToBasisPoints,
} from '../../../../../shared/domain/payment-allocation';
import type { CommissionPolicy } from '../../../application/ports/in/commission-policy';
export function commissionBasisPoints(value: string): number {
  return percentageToBasisPoints(value);
}
export class EnvironmentCommissionPolicy implements CommissionPolicy {
  constructor(private readonly rate: number) {
    allocatePayment(1, 1, rate);
  }
  basisPoints() {
    return this.rate;
  }
  allocate(base: number, total: number) {
    return allocatePayment(base, total, this.rate);
  }
}
