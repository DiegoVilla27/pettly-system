import type {
  StockCommand,
  HoldCommand,
  HoldDecisionCommand,
} from '../../commands/inventory.commands';
import type { StockQuery } from '../../queries/inventory.queries';
import type { StockState, HoldState, Movement } from '../../results/inventory';
export interface InventoryUseCases {
  change(
    command: StockCommand,
  ): Promise<{ stock: StockState; movement: Movement }>;
  reserve(
    command: HoldCommand,
  ): Promise<{ stock: StockState; hold: HoldState }>;
  decide(
    command: HoldDecisionCommand,
  ): Promise<{ stock: StockState; hold: HoldState }>;
  get(query: StockQuery): Promise<StockState>;
  movements(
    query: StockQuery,
  ): Promise<{ items: Movement[]; total: number; page: number; limit: number }>;
  hold(actorId: string, id: string): Promise<HoldState>;
  availability(
    ids: string[],
  ): Promise<{ variantId: string; available: number }[]>;
  expireDue(): Promise<void>;
}
export const INVENTORY_USE_CASES = Symbol('INVENTORY_USE_CASES');
