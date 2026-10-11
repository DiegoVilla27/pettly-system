import type { ApiResponse } from '@pettly/api-client';
export type Payment = Omit<ApiResponse<'getVisiblePayment'>, 'checkoutUrl'>;
export type PaymentStatus = Payment['status'];
export type PaymentPolicy = ApiResponse<'getPaymentPolicy'>;
export type PaymentHistory = ApiResponse<'listVisiblePaymentHistory'>;
export type FinancialEvidence = ApiResponse<'getPaymentFinancialEvidence'>;
export type PaymentScope =
  { scope: 'platform' } | { scope: 'business'; organizationId: string };
export type PaymentContext = PaymentScope & { paymentId: string };
export type PaymentQuery = PaymentScope & {
  page: number;
  limit: number;
  status?: PaymentStatus;
};
export type PaymentPage = Omit<ApiResponse<'listVisiblePayments'>, 'items'> & {
  items: Payment[];
};
export interface Company {
  id: string;
  name: string;
}
export const statuses = [
  { value: 'created', label: 'Creado' },
  { value: 'processing', label: 'En proceso' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'declined', label: 'Rechazado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'expired', label: 'Vencido' },
  { value: 'reconciliation_required', label: 'Requiere conciliación' },
] as const;
export function statusLabel(s: PaymentStatus) {
  return statuses.find((v) => v.value === s)?.label ?? s;
}
export const distributionLabels: Record<Payment['distributionStatus'], string> =
  {
    unconfirmed: 'Sin confirmar',
    pending: 'Pendiente de distribución',
    distributed: 'Distribución confirmada',
    failed: 'Distribución fallida',
  };
export const outcomeLabels: Record<
  FinancialEvidence['events'][number]['outcome'],
  string
> = {
  applied: 'Aplicado',
  ignored: 'Sin cambio',
  reconciliation_required: 'Requiere revisión',
};
export function detailLink(p: Payment, q: PaymentScope): string[] {
  return q.scope === 'platform'
    ? ['/pagos', 'plataforma', p.id]
    : ['/pagos', 'empresa', q.organizationId, p.id];
}
