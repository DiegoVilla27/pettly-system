import type { CartState } from '../../results/cart';
export interface CartWork {
  lock(key: string): Promise<void>;
  find(userId: string): Promise<CartState | null>;
  save(state: CartState): Promise<void>;
}
export interface CartRepository {
  run<T>(work: (tx: CartWork) => Promise<T>): Promise<T>;
}
export const CART_REPOSITORY = Symbol('CART_REPOSITORY');
