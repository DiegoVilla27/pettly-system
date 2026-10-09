import type { StockState, HoldState, Movement } from '../../results/inventory';
export interface InventoryWork {
  lock(key: string): Promise<void>;
  stock(variantId: string): Promise<StockState | null>;
  availability(
    ids: string[],
    now: Date,
  ): Promise<{ variantId: string; available: number }[]>;
  saveStock(state: StockState): Promise<void>;
  hold(id: string): Promise<HoldState | null>;
  holds(variantId: string): Promise<HoldState[]>;
  saveHold(state: HoldState): Promise<void>;
  expireHolds(ids: string[], now: Date): Promise<void>;
  addMovements(items: Movement[]): Promise<void>;
  expiredVariants(now: Date): Promise<string[]>;
  movement(orgId: string, key: string): Promise<Movement | null>;
  addMovement(state: Movement): Promise<void>;
  movements(
    variantId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Movement[]; total: number; page: number; limit: number }>;
}
export interface InventoryRepository {
  run<T>(work: (tx: InventoryWork) => Promise<T>): Promise<T>;
}
export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');
