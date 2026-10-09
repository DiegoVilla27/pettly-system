import { ApplicationError } from '../../../../shared/domain/application-error';
import type { CheckoutSnapshot } from '../value-objects/checkout';
export const ORDER_STATUSES = [
  'awaiting_payment',
  'paid',
  'preparing',
  'dispatched',
  'ready_for_pickup',
  'delivered',
  'cancelled',
  'expired',
] as const;
export interface OrderState {
  id: string;
  buyerId: string;
  organizationId: string;
  quoteId: string;
  idempotencyKey: string;
  fingerprint: string;
  status: (typeof ORDER_STATUSES)[number];
  version: number;
  snapshot: CheckoutSnapshot;
  totalMinor: number;
  currency: string;
  paymentId: string | null;
  expiresAt: Date;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface QuoteState {
  id: string;
  buyerId: string;
  cartId: string;
  cartVersion: number;
  snapshot: CheckoutSnapshot;
  expiresAt: Date;
  createdAt: Date;
}
export class Order {
  private constructor(private state: OrderState) {}
  static create(
    id: string,
    buyerId: string,
    quote: QuoteState,
    key: string,
    fingerprint: string,
    now: Date,
  ) {
    if (
      quote.expiresAt <= now ||
      quote.buyerId !== buyerId ||
      !quote.snapshot.lines.length
    )
      throw new ApplicationError(
        'CONFLICT',
        'The checkout quote is expired or invalid.',
      );
    return new Order({
      id,
      buyerId,
      organizationId: quote.snapshot.organizationId,
      quoteId: quote.id,
      idempotencyKey: key,
      fingerprint,
      status: 'awaiting_payment',
      version: 1,
      snapshot: structuredClone(quote.snapshot),
      totalMinor: quote.snapshot.totalMinor,
      currency: quote.snapshot.currency,
      paymentId: null,
      expiresAt: new Date(now.getTime() + 30 * 60000),
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  static restore(s: OrderState) {
    return new Order({ ...s, snapshot: structuredClone(s.snapshot) });
  }
  snapshot() {
    return { ...this.state, snapshot: structuredClone(this.state.snapshot) };
  }
  expect(v: number) {
    if (this.state.version !== v)
      throw new ApplicationError(
        'CONFLICT',
        'The order changed. Read its current version.',
      );
  }
  cancel(now: Date) {
    if (this.state.status !== 'awaiting_payment')
      throw new ApplicationError(
        'CONFLICT',
        'Only an unpaid pending order can be cancelled; paid cancellation requires a refund workflow.',
      );
    this.state.status = 'cancelled';
    this.touch(now);
  }
  expire(now: Date) {
    if (this.state.status !== 'awaiting_payment' || now < this.state.expiresAt)
      return false;
    this.state.status = 'expired';
    this.touch(now);
    return true;
  }
  settle(paymentId: string, amount: number, currency: string, now: Date) {
    if (this.state.paymentId === paymentId) {
      if (this.state.totalMinor !== amount || this.state.currency !== currency)
        throw new ApplicationError(
          'CONFLICT',
          'The payment replay amount differs.',
        );
      return false;
    }
    if (
      this.state.status !== 'awaiting_payment' ||
      now >= this.state.expiresAt ||
      amount !== this.state.totalMinor ||
      currency !== this.state.currency
    )
      throw new ApplicationError(
        'CONFLICT',
        'Payment does not match a live unpaid order; reconciliation is required.',
      );
    this.state.paymentId = paymentId;
    this.state.paidAt = now;
    this.state.status = 'paid';
    this.touch(now);
    return true;
  }
  fulfill(
    status: 'preparing' | 'dispatched' | 'ready_for_pickup' | 'delivered',
    now: Date,
  ) {
    const expected =
      status === 'preparing'
        ? 'paid'
        : status === 'delivered'
          ? this.state.snapshot.fulfillment === 'delivery'
            ? 'dispatched'
            : 'ready_for_pickup'
          : 'preparing';
    if (
      this.state.status !== expected ||
      (status === 'dispatched' &&
        this.state.snapshot.fulfillment !== 'delivery') ||
      (status === 'ready_for_pickup' &&
        this.state.snapshot.fulfillment !== 'pickup')
    )
      throw new ApplicationError(
        'CONFLICT',
        'Invalid fulfillment transition or delivery mode.',
      );
    this.state.status = status;
    this.touch(now);
  }
  private touch(now: Date) {
    this.state.version++;
    this.state.updatedAt = now;
  }
}
