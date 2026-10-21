export type {
  PaymentState,
  ProviderObservation,
} from '../../domain/aggregates/payment';
export interface PaymentAudit {
  id: string;
  paymentId: string;
  version: number;
  action: string;
  actorId: string | null;
  requestId: string;
  createdAt: Date;
}
export interface PaymentEvent {
  id: string;
  paymentId: string;
  provider: string;
  eventId: string;
  fingerprint: string;
  observation: import('../../domain/aggregates/payment').ProviderObservation;
  outcome: 'applied' | 'ignored' | 'reconciliation_required';
  createdAt: Date;
}
export interface PaymentLedger {
  id: string;
  paymentId: string;
  eventId: string;
  kind: 'capture';
  amountMinor: number;
  platformMinor: number;
  sellerMinor: number;
  createdAt: Date;
}
export interface PaymentJob {
  id: string;
  paymentId: string;
  kind: 'checkout' | 'reconcile';
  status: 'queued' | 'retry' | 'done';
  attempts: number;
  nextAt: Date;
  leaseId: string | null;
  leaseUntil: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}
