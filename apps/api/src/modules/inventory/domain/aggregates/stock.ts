import { ApplicationError } from '../../../../shared/domain/application-error';
export interface StockState {
  variantId: string;
  onHand: number;
  reserved: number;
  version: number;
  updatedAt: Date;
}
export const MOVEMENT_KINDS = [
  'receipt',
  'issue',
  'adjustment',
  'hold',
  'release',
  'consume',
  'expire',
] as const;
export class Stock {
  private constructor(private state: StockState) {}
  static restore(state: StockState) {
    return new Stock({ ...state });
  }
  static empty(variantId: string, now: Date) {
    return new Stock({
      variantId,
      onHand: 0,
      reserved: 0,
      version: 1,
      updatedAt: now,
    });
  }
  snapshot() {
    return { ...this.state };
  }
  expect(version: number) {
    if (version !== this.state.version)
      throw new ApplicationError(
        'CONFLICT',
        'The stock changed. Read its current version.',
      );
  }
  change(onHandDelta: number, reservedDelta: number, now: Date) {
    if (!Number.isInteger(onHandDelta) || !Number.isInteger(reservedDelta))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Stock quantities must be integers.',
      );
    const onHand = this.state.onHand + onHandDelta,
      reserved = this.state.reserved + reservedDelta;
    if (onHand < 0 || reserved < 0 || reserved > onHand || onHand > 1000000000)
      throw new ApplicationError(
        'CONFLICT',
        'Insufficient available stock or invalid reserved balance.',
      );
    this.state = {
      ...this.state,
      onHand,
      reserved,
      version: this.state.version + 1,
      updatedAt: now,
    };
  }
}
export interface HoldState {
  orderId: string | null;
  id: string;
  variantId: string;
  organizationId: string;
  referenceId: string;
  quantity: number;
  status: 'active' | 'released' | 'consumed' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
export class Hold {
  static create(
    id: string,
    variantId: string,
    org: string,
    referenceId: string,
    quantity: number,
    expiresAt: Date,
    now: Date,
  ): HoldState {
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1000000 ||
      expiresAt.getTime() <= now.getTime() ||
      expiresAt.getTime() > now.getTime() + 30 * 60 * 1000
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Use 1–1000000 units and an expiry within thirty minutes.',
      );
    return {
      id,
      variantId,
      organizationId: org,
      referenceId,
      orderId: null,
      quantity,
      status: 'active',
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };
  }
  static close(
    state: HoldState,
    status: 'released' | 'consumed' | 'expired',
    now: Date,
  ): HoldState {
    if (state.status !== 'active')
      throw new ApplicationError('CONFLICT', 'This hold has already ended.');
    if (status === 'consumed' && state.expiresAt <= now)
      throw new ApplicationError(
        'CONFLICT',
        'An expired hold cannot be consumed.',
      );
    return { ...state, status, updatedAt: now };
  }
}
