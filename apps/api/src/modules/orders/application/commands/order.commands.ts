import type { Address, CommercialPolicy } from '../results/order';
export class PolicyCommand {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly data: Omit<
      CommercialPolicy,
      'organizationId' | 'version' | 'updatedAt'
    >,
    readonly expectedVersion: number,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
export class QuoteCommand {
  constructor(
    readonly buyerId: string,
    readonly expectedCartVersion: number,
    readonly fulfillment: 'pickup' | 'delivery',
    readonly contact: Address,
  ) {}
}
export class CreateOrderCommand {
  constructor(
    readonly buyerId: string,
    readonly quoteId: string,
    readonly expectedTotalMinor: number,
    readonly consent: boolean,
    readonly idempotencyKey: string,
    readonly requestId: string,
  ) {}
}
export class OrderDecisionCommand {
  constructor(
    readonly actorId: string,
    readonly orderId: string,
    readonly expectedVersion: number,
    readonly reason: string,
    readonly requestId: string,
    readonly status?:
      'preparing' | 'dispatched' | 'ready_for_pickup' | 'delivered',
  ) {}
}
