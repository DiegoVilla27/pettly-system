import type { CartState } from '../../results/cart';
import type { CartQuery } from '../../queries/cart.query';
import type {
  CartCommand,
  PutCartItemCommand,
  RemoveCartItemCommand,
} from '../../commands/cart.commands';
import type { SaleVariant } from '../../../../catalog/application/results/catalog';
export interface CartDetail extends CartState {
  current: SaleVariant[];
}
export interface CartUseCases {
  get(query: CartQuery): Promise<CartDetail>;
  put(command: PutCartItemCommand): Promise<CartDetail>;
  remove(command: RemoveCartItemCommand): Promise<CartDetail>;
  clear(command: CartCommand): Promise<CartDetail>;
}
export const CART_USE_CASES = Symbol('CART_USE_CASES');
