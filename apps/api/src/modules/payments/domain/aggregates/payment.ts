import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  validateAllocation,
  type PaymentAllocation,
} from '../../../../shared/domain/payment-allocation';
export const PAYMENT_STATUSES = [
  'created',
  'processing',
  'pending',
  'approved',
  'declined',
  'cancelled',
  'expired',
  'reconciliation_required',
] as const;
export const DISTRIBUTION_STATUSES = [
  'unconfirmed',
  'pending',
  'distributed',
  'failed',
] as const;
export interface PaymentState {
  id: string;
  orderId: string;
  buyerId: string;
  organizationId: string;
  idempotencyKey: string;
  provider: string;
  reference: string | null;
  checkoutUrl: string | null;
  status: (typeof PAYMENT_STATUSES)[number];
  distributionStatus: (typeof DISTRIBUTION_STATUSES)[number];
  allocation: PaymentAllocation;
  amountMinor: number;
  currency: 'COP';
  feeMinor: number | null;
  version: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
export interface ProviderObservation {
  eventId: string;
  reference: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  distributionStatus: (typeof DISTRIBUTION_STATUSES)[number];
  feeMinor: number | null;
}
export class Payment {
  private constructor(private state: PaymentState) {}
  static create(s: PaymentState) {
    validateAllocation(s.allocation);
    if (
      s.currency !== 'COP' ||
      s.amountMinor !== s.allocation.totalMinor ||
      s.expiresAt <= s.createdAt ||
      s.status !== 'created' ||
      s.version !== 1
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Payment requires a live COP order and its accepted allocation.',
      );
    return new Payment(structuredClone(s));
  }
  static restore(s: PaymentState) {
    validateAllocation(s.allocation);
    return new Payment(structuredClone(s));
  }
  snapshot() {
    return structuredClone(this.state);
  }
  processing(now: Date) {
    if (this.state.status === 'created') {
      this.state.status = 'processing';
      this.touch(now);
    }
  }
  session(reference: string, url: string, now: Date) {
    if (this.state.reference && this.state.reference !== reference)
      throw new ApplicationError(
        'CONFLICT',
        'Provider returned a different reference for the same payment.',
      );
    if (
      !reference ||
      reference.length > 200 ||
      !['https:'].includes(new URL(url).protocol)
    )
      throw new ApplicationError(
        'DEPENDENCY_UNAVAILABLE',
        'Provider checkout response is invalid.',
      );
    this.state.reference = reference;
    this.state.checkoutUrl = url;
    if (['created', 'processing'].includes(this.state.status))
      this.state.status = 'pending';
    this.touch(now);
  }
  expire(now: Date) {
    // Only an attempt never submitted to a provider is safe to expire locally.
    if (this.state.status === 'created' && now >= this.state.expiresAt) {
      this.state.status = 'expired';
      this.touch(now);
      return true;
    }
    return false;
  }
  abandon(now: Date) {
    if (this.state.status === 'created') {
      this.state.status = 'cancelled';
      this.touch(now);
    }
  }
  observe(
    o: ProviderObservation,
    acceptedByOrder: boolean,
    now: Date,
  ): 'applied' | 'reconciliation_required' | 'ignored' {
    if (
      !o.eventId ||
      o.eventId.length > 200 ||
      !o.reference ||
      o.reference.length > 200 ||
      !Number.isSafeInteger(o.amountMinor) ||
      o.amountMinor < 0 ||
      !['pending', 'approved', 'declined', 'cancelled'].includes(o.status) ||
      !DISTRIBUTION_STATUSES.includes(o.distributionStatus) ||
      (o.feeMinor !== null &&
        (!Number.isSafeInteger(o.feeMinor) || o.feeMinor < 0))
    )
      throw new ApplicationError(
        'DEPENDENCY_UNAVAILABLE',
        'Invalid authoritative provider observation.',
      );
    if (
      o.paymentId !== this.state.id ||
      o.amountMinor !== this.state.amountMinor ||
      o.currency !== this.state.currency ||
      (this.state.reference !== null && o.reference !== this.state.reference)
    ) {
      this.state.status = 'reconciliation_required';
      this.touch(now);
      return 'reconciliation_required';
    }
    if (this.state.status === 'approved' && o.status !== 'approved')
      return 'ignored';
    if (
      ['declined', 'cancelled', 'expired'].includes(this.state.status) &&
      o.status === 'pending'
    )
      return 'ignored';
    if (
      this.state.status === 'reconciliation_required' &&
      o.status !== 'approved'
    )
      return 'ignored';
    this.state.reference = o.reference;
    this.state.status =
      o.status === 'approved' && !acceptedByOrder
        ? 'reconciliation_required'
        : o.status;
    if (o.status === 'approved') {
      if (
        this.state.distributionStatus !== 'distributed' ||
        o.distributionStatus === 'distributed'
      )
        this.state.distributionStatus = o.distributionStatus;
      if (o.feeMinor !== null) this.state.feeMinor = o.feeMinor;
    }
    this.touch(now);
    return this.state.status === 'reconciliation_required'
      ? 'reconciliation_required'
      : 'applied';
  }
  private touch(now: Date) {
    this.state.version++;
    this.state.updatedAt = now;
  }
}
