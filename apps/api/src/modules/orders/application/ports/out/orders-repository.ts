import type {
  OrderState,
  QuoteState,
  CommercialPolicy,
  OrderAudit,
  PolicyAudit,
} from '../../results/order';
import type { OrdersQuery } from '../../queries/order.queries';
export interface OrdersWork {
  lock(key: string): Promise<void>;
  policy(org: string): Promise<CommercialPolicy | null>;
  savePolicy(p: CommercialPolicy): Promise<void>;
  policyAudit(
    actorId: string,
    org: string,
    version: number,
    reason: string,
    requestId: string,
    now: Date,
    id: string,
  ): Promise<void>;
  quote(id: string): Promise<QuoteState | null>;
  saveQuote(q: QuoteState): Promise<void>;
  order(id: string): Promise<OrderState | null>;
  replay(buyerId: string, key: string): Promise<OrderState | null>;
  saveOrder(o: OrderState): Promise<void>;
  list(q: OrdersQuery): Promise<{
    items: OrderState[];
    total: number;
    page: number;
    limit: number;
  }>;
  audit(a: OrderAudit): Promise<void>;
  audits(
    id: string,
    page: number,
    limit: number,
  ): Promise<{
    items: OrderAudit[];
    total: number;
    page: number;
    limit: number;
  }>;
  policyAudits(
    org: string,
    page: number,
    limit: number,
  ): Promise<{
    items: PolicyAudit[];
    total: number;
    page: number;
    limit: number;
  }>;
  due(now: Date): Promise<string[]>;
}
export interface OrdersRepository {
  run<T>(work: (tx: OrdersWork) => Promise<T>): Promise<T>;
}
export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');
