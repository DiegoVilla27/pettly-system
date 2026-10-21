import type {
  OrderState,
  QuoteState,
  CommercialPolicy,
  OrderAudit,
} from '../../../../application/results/order';
export class OrdersHttpMapper {
  static order(s: OrderState) {
    const { idempotencyKey, fingerprint, ...fields } = s;
    void idempotencyKey;
    void fingerprint;
    return {
      ...fields,
      expiresAt: s.expiresAt.toISOString(),
      paidAt: s.paidAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
  static quote(s: QuoteState) {
    return {
      ...s,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    };
  }
  static policy(s: CommercialPolicy | null) {
    return {
      policy: s ? { ...s, updatedAt: s.updatedAt.toISOString() } : null,
    };
  }
  static audit(s: OrderAudit) {
    return { ...s, createdAt: s.createdAt.toISOString() };
  }
}
