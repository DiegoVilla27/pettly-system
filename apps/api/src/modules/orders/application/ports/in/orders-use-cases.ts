import type {
  PolicyCommand,
  QuoteCommand,
  CreateOrderCommand,
  OrderDecisionCommand,
} from '../../commands/order.commands';
import type { OrdersQuery } from '../../queries/order.queries';
import type {
  OrderState,
  QuoteState,
  CommercialPolicy,
  OrderAudit,
  PolicyAudit,
} from '../../results/order';
export interface OrdersUseCases {
  policy(actorId: string, org: string): Promise<CommercialPolicy | null>;
  configure(c: PolicyCommand): Promise<CommercialPolicy>;
  quote(c: QuoteCommand): Promise<QuoteState>;
  quoteDetail(actorId: string, id: string): Promise<QuoteState>;
  create(c: CreateOrderCommand): Promise<OrderState>;
  get(actorId: string, id: string): Promise<OrderState>;
  list(q: OrdersQuery): Promise<{
    items: OrderState[];
    total: number;
    page: number;
    limit: number;
  }>;
  cancel(c: OrderDecisionCommand): Promise<OrderState>;
  fulfill(c: OrderDecisionCommand): Promise<OrderState>;
  audits(
    actorId: string,
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
    actorId: string,
    org: string,
    page: number,
    limit: number,
  ): Promise<{
    items: PolicyAudit[];
    total: number;
    page: number;
    limit: number;
  }>;
  expireDue(): Promise<void>;
}
export const ORDERS_USE_CASES = Symbol('ORDERS_USE_CASES');
