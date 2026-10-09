export interface OrderStockContext {
  orderId: string;
  buyerId: string;
  organizationId: string;
  expiresAt: Date;
  lines: { variantId: string; holdId: string; quantity: number }[];
}
/** Trusted Orders port. Never exposed directly over HTTP. */
export interface OrderStock {
  reserveOrder(context: OrderStockContext, requestId: string): Promise<void>;
  closeOrder(
    context: OrderStockContext,
    kind: 'release' | 'consume',
    actorId: string | null,
    requestId: string,
  ): Promise<void>;
}
export const ORDER_STOCK = Symbol('ORDER_STOCK');
