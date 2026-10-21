import type {
  StockState,
  HoldState,
  Movement,
} from '../../../../application/results/inventory';
export class InventoryHttpMapper {
  static stock(s: StockState) {
    return {
      ...s,
      available: s.onHand - s.reserved,
      updatedAt: s.updatedAt.toISOString(),
    };
  }
  static hold(h: HoldState) {
    return {
      ...h,
      expiresAt: h.expiresAt.toISOString(),
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    };
  }
  static movement(m: Movement) {
    const { fingerprint: _, ...fields } = m;
    return { ...fields, createdAt: m.createdAt.toISOString() };
  }
}
