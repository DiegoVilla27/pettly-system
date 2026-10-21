import type { CartDetail } from '../../../../application/ports/in/cart-use-cases';
export class CartHttpMapper {
  static detail(c: CartDetail) {
    return {
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
