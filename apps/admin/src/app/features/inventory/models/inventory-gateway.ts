import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Company,
  InventoryQuery,
  InventoryPage,
  InventoryRow,
  InventoryContext,
  Ledger,
  MovementIntent,
  MovementResult,
} from './inventory';
export interface InventoryGateway {
  companies(search: string, currentId?: string): Observable<Company[]>;
  list(query: InventoryQuery): Observable<InventoryPage>;
  detail(context: InventoryContext): Observable<InventoryRow>;
  ledger(
    context: InventoryContext,
    page: number,
    limit: number,
  ): Observable<Ledger>;
  movement(intent: MovementIntent): Observable<MovementResult>;
}
export const INVENTORY_GATEWAY = new InjectionToken<InventoryGateway>(
  'INVENTORY_GATEWAY',
);
