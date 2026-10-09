import type { CartState } from '../../results/cart';
export interface CartCheckout {
  read(userId: string): Promise<CartState>;
  consume(userId: string, expectedVersion: number): Promise<void>;
}
export const CART_CHECKOUT = Symbol('CART_CHECKOUT');
