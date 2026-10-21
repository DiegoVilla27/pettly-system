export type { StockState, HoldState } from '../../domain/aggregates/stock';
export interface Movement {
  id: string;
  variantId: string;
  organizationId: string;
  actorId: string | null;
  holdId: string | null;
  kind: string;
  onHandDelta: number;
  reservedDelta: number;
  onHandAfter: number;
  reservedAfter: number;
  versionAfter: number;
  idempotencyKey: string;
  fingerprint: string;
  reason: string;
  requestId: string;
  createdAt: Date;
}

export type InventoryRow =
  import('../../../catalog/application/ports/in/inventory-catalog').InventoryVariant & {
    stock: import('../../domain/aggregates/stock').StockState;
  };
export interface InventoryPage {
  items: InventoryRow[];
  total: number;
  page: number;
  limit: number;
}
