import type { OrderState } from '../../results/order';
export interface OrderPayments {
  forPayment(actorId: string, orderId: string): Promise<OrderState>;
  inspect(orderId: string): Promise<OrderState>;
  settleVerified(
    orderId: string,
    paymentId: string,
    amountMinor: number,
    currency: string,
    requestId: string,
  ): Promise<OrderState>;
}
export const ORDER_PAYMENTS = Symbol('ORDER_PAYMENTS');
