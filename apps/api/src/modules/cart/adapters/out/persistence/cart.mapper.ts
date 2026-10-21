import type { Cart as Row, Prisma } from '@prisma/client';
import type { CartState } from '../../../application/results/cart';
export class CartPersistenceMapper {
  static from(row: Row): CartState {
    return { ...row, items: row.items as unknown as CartState['items'] };
  }
  static to(state: CartState) {
    return { ...state, items: state.items as unknown as Prisma.InputJsonValue };
  }
}
