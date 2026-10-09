import type {
  PaymentState,
  PaymentAudit,
  PaymentEvent,
  PaymentLedger,
  PaymentJob,
} from '../../results/payment';
import type { PaymentsQuery } from '../../queries/payment.queries';
export interface PaymentsWork {
  lock(key: string): Promise<void>;
  payment(id: string): Promise<PaymentState | null>;
  replay(buyerId: string, key: string): Promise<PaymentState | null>;
  active(orderId: string): Promise<PaymentState | null>;
  save(p: PaymentState): Promise<void>;
  audit(a: PaymentAudit): Promise<void>;
  history(
    id: string,
    page: number,
    limit: number,
  ): Promise<{
    items: PaymentAudit[];
    total: number;
    page: number;
    limit: number;
  }>;
  list(q: PaymentsQuery): Promise<{
    items: PaymentState[];
    total: number;
    page: number;
    limit: number;
  }>;
  event(provider: string, eventId: string): Promise<PaymentEvent | null>;
  saveEvent(e: PaymentEvent): Promise<void>;
  capture(paymentId: string): Promise<PaymentLedger | null>;
  saveLedger(l: PaymentLedger): Promise<void>;
  financials(
    paymentId: string,
  ): Promise<{ events: PaymentEvent[]; ledger: PaymentLedger[] }>;
  job(id: string): Promise<PaymentJob | null>;
  jobFor(
    paymentId: string,
    kind: PaymentJob['kind'],
  ): Promise<PaymentJob | null>;
  saveJob(j: PaymentJob): Promise<void>;
  due(now: Date): Promise<PaymentJob[]>;
}
export interface PaymentsRepository {
  run<T>(work: (tx: PaymentsWork) => Promise<T>): Promise<T>;
}
export const PAYMENTS_REPOSITORY = Symbol('PAYMENTS_REPOSITORY');
