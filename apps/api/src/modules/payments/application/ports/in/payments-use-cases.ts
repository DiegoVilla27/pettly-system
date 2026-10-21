import type {
  CreatePaymentCommand,
  ReconcilePaymentCommand,
} from '../../commands/payment.commands';
import type {
  PaymentQuery,
  PaymentsQuery,
} from '../../queries/payment.queries';
import type {
  PaymentState,
  PaymentAudit,
  PaymentEvent,
  PaymentLedger,
} from '../../results/payment';
export interface PaymentsUseCases {
  create(c: CreatePaymentCommand): Promise<PaymentState>;
  get(q: PaymentQuery): Promise<PaymentState>;
  list(q: PaymentsQuery): Promise<{
    items: PaymentState[];
    total: number;
    page: number;
    limit: number;
  }>;
  history(
    q: PaymentQuery,
    page: number,
    limit: number,
  ): Promise<{
    items: PaymentAudit[];
    total: number;
    page: number;
    limit: number;
  }>;
  financials(
    q: PaymentQuery,
  ): Promise<{ events: PaymentEvent[]; ledger: PaymentLedger[] }>;
  reconcile(c: ReconcilePaymentCommand): Promise<PaymentState>;
  policy(actorId: string): Promise<{
    rateBasisPoints: number;
    percent: number;
    base: 'product_subtotal';
    processingFeeBearer: 'seller';
    provider: string;
    providerEnabled: boolean;
  }>;
  runDue(): Promise<void>;
}
export const PAYMENTS_USE_CASES = Symbol('PAYMENTS_USE_CASES');
