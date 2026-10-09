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
