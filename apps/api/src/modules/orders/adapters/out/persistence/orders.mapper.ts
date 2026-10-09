import type {
  Order as Row,
  CheckoutQuote,
  OrderPolicy,
  Prisma,
} from '@prisma/client';
import type {
  OrderState,
  QuoteState,
  CommercialPolicy,
} from '../../../application/results/order';
export class OrdersPersistenceMapper {
  static order(row: Row): OrderState {
    return {
      ...row,
      status: row.status as OrderState['status'],
      totalMinor: Number(row.totalMinor),
      snapshot: row.snapshot as unknown as OrderState['snapshot'],
    };
  }
  static orderData(s: OrderState) {
    return {
      ...s,
      totalMinor: BigInt(s.totalMinor),
      snapshot: s.snapshot as unknown as Prisma.InputJsonValue,
    };
  }
  static quote(r: CheckoutQuote): QuoteState {
    return { ...r, snapshot: r.snapshot as unknown as QuoteState['snapshot'] };
  }
  static quoteData(s: QuoteState) {
    return { ...s, snapshot: s.snapshot as unknown as Prisma.InputJsonValue };
  }
  static policy(r: OrderPolicy): CommercialPolicy {
    return {
      ...(r.data as unknown as Omit<
        CommercialPolicy,
        'organizationId' | 'version' | 'updatedAt'
      >),
      organizationId: r.organizationId,
      version: r.version,
      updatedAt: r.updatedAt,
    };
  }
  static policyData(s: CommercialPolicy) {
    const { organizationId, version, updatedAt, ...data } = s;
    return {
      organizationId,
      version,
      updatedAt,
      data: data as unknown as Prisma.InputJsonValue,
    };
  }
}
