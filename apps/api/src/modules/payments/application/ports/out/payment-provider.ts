import type { PaymentState, ProviderObservation } from '../../results/payment';
export interface PaymentProvider {
  readonly name: string;
  readonly enabled: boolean;
  /** Must verify seller enrollment, use payment.id as durable idempotency key and never create after expiresAt. */
  createCheckout(
    payment: PaymentState,
  ): Promise<{ reference: string; url: string }>;
  /** Authoritative lookup by reference OR durable idempotency key, not an unverified webhook payload. Stable eventId identifies the observed provider revision. */
  lookup(payment: PaymentState): Promise<ProviderObservation>;
}
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
