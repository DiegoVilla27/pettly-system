import type {
  PaymentState,
  PaymentAudit,
  PaymentEvent,
  PaymentLedger,
} from '../../../../application/results/payment';
export class PaymentsHttpMapper {
  static payment(s: PaymentState) {
    const { idempotencyKey, ...p } = s;
    void idempotencyKey;
    return {
      ...p,
      expiresAt: p.expiresAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
  static audit(a: PaymentAudit) {
    return { ...a, createdAt: a.createdAt.toISOString() };
  }
  static event(e: PaymentEvent) {
    const { fingerprint, ...rest } = e;
    void fingerprint;
    return { ...rest, createdAt: e.createdAt.toISOString() };
  }
  static ledger(l: PaymentLedger) {
    return { ...l, createdAt: l.createdAt.toISOString() };
  }
}
