import { ApplicationError } from '../../../../shared/domain/application-error';
export interface CartLine {
  variantId: string;
  quantity: number;
}
export interface CartState {
  id: string;
  userId: string;
  organizationId: string | null;
  currency: string | null;
  items: CartLine[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
export class Cart {
  private constructor(private state: CartState) {}
  static empty(id: string, userId: string, now: Date) {
    return new Cart({
      id,
      userId,
      organizationId: null,
      currency: null,
      items: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  static restore(s: CartState) {
    return new Cart({ ...s, items: s.items.map((l) => ({ ...l })) });
  }
  snapshot() {
    return { ...this.state, items: this.state.items.map((l) => ({ ...l })) };
  }
  expect(version: number) {
    if (version !== this.state.version)
      throw new ApplicationError(
        'CONFLICT',
        'The cart changed. Read its current version.',
      );
  }
  put(
    variantId: string,
    quantity: number,
    organizationId: string,
    currency: string,
    now: Date,
  ) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Cart quantities must be integers between one and ninety-nine.',
      );
    if (
      this.state.items.length &&
      (this.state.organizationId !== organizationId ||
        this.state.currency !== currency)
    )
      throw new ApplicationError(
        'CONFLICT',
        'Clear the cart explicitly before changing seller or currency.',
      );
    const line = this.state.items.find((l) => l.variantId === variantId);
    if (line?.quantity === quantity) return false;
    if (!line && this.state.items.length >= 50)
      throw new ApplicationError(
        'CONFLICT',
        'At most fifty cart lines are allowed.',
      );
    if (line) line.quantity = quantity;
    else this.state.items.push({ variantId, quantity });
    this.state.organizationId = organizationId;
    this.state.currency = currency;
    this.touch(now);
    return true;
  }
  remove(variantId: string, now: Date) {
    const before = this.state.items.length;
    this.state.items = this.state.items.filter(
      (l) => l.variantId !== variantId,
    );
    if (before === this.state.items.length) return false;
    if (!this.state.items.length) {
      this.state.organizationId = null;
      this.state.currency = null;
    }
    this.touch(now);
    return true;
  }
  clear(now: Date) {
    if (!this.state.items.length) return false;
    this.state.items = [];
    this.state.organizationId = null;
    this.state.currency = null;
    this.touch(now);
    return true;
  }
  private touch(now: Date) {
    this.state.version++;
    this.state.updatedAt = now;
  }
}
