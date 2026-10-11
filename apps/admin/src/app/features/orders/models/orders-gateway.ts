import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Company,
  Order,
  OrderQuery,
  OrderPage,
  OrderContext,
  OrderCommand,
  OrderAudit,
} from './order';
export interface OrdersGateway {
  companies(search: string, currentId?: string): Observable<Company[]>;
  list(query: OrderQuery): Observable<OrderPage>;
  get(context: OrderContext): Observable<Order>;
  audit(
    context: OrderContext,
    page: number,
  ): Observable<{ items: OrderAudit[]; total: number }>;
  execute(command: OrderCommand): Observable<Order>;
}
export const ORDERS_GATEWAY = new InjectionToken<OrdersGateway>(
  'ORDERS_GATEWAY',
);
