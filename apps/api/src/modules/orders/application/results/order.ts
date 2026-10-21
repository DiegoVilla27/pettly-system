import type { CommercialPolicy } from '../../domain/value-objects/checkout';
export type { OrderState, QuoteState } from '../../domain/aggregates/order';
export type {
  CheckoutSnapshot,
  CommercialPolicy,
  Address,
  CheckoutLine,
} from '../../domain/value-objects/checkout';
export interface OrderAudit {
  version: number;
  id: string;
  orderId: string;
  actorId: string | null;
  action: string;
  reason: string;
  requestId: string;
  createdAt: Date;
}

export interface PolicyAudit {
  id: string;
  organizationId: string;
  actorId: string;
  version: number;
  snapshot: Omit<CommercialPolicy, 'organizationId' | 'version' | 'updatedAt'>;
  reason: string;
  requestId: string;
  createdAt: Date;
}
