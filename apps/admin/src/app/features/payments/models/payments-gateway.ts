import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Company,
  Payment,
  PaymentContext,
  PaymentQuery,
  PaymentPage,
  PaymentHistory,
  PaymentPolicy,
  FinancialEvidence,
} from './payment';
export interface PaymentsGateway {
  companies(search: string, currentId?: string): Observable<Company[]>;
  list(q: PaymentQuery): Observable<PaymentPage>;
  get(c: PaymentContext): Observable<Payment>;
  history(c: PaymentContext, page: number): Observable<PaymentHistory>;
  policy(): Observable<PaymentPolicy>;
  financials(c: PaymentContext): Observable<FinancialEvidence>;
  reconcile(c: PaymentContext): Observable<Payment>;
}
export const PAYMENTS_GATEWAY = new InjectionToken<PaymentsGateway>(
  'PAYMENTS_GATEWAY',
);
