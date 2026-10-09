import {
  Prisma,
  type PaymentAttempt,
  type PaymentProviderEvent,
  type PaymentLedgerEntry,
  type PaymentOutboxJob,
} from '@prisma/client';
import type {
  PaymentState,
  PaymentEvent,
  PaymentLedger,
  PaymentJob,
} from '../../../application/results/payment';
function integer(v: bigint) {
  const n = Number(v);
  if (!Number.isSafeInteger(n))
    throw new Error('Payment amount exceeds supported integer range.');
  return n;
}
export class PaymentsPersistenceMapper {
  static payment(r: PaymentAttempt): PaymentState {
    return {
      ...r,
      status: r.status as PaymentState['status'],
      distributionStatus:
        r.distributionStatus as PaymentState['distributionStatus'],
      currency: r.currency as 'COP',
      allocation: r.allocation as unknown as PaymentState['allocation'],
      amountMinor: integer(r.amountMinor),
      feeMinor: r.feeMinor === null ? null : integer(r.feeMinor),
    };
  }
  static data(s: PaymentState) {
    return {
      ...s,
      allocation: s.allocation as unknown as Prisma.InputJsonValue,
      amountMinor: BigInt(s.amountMinor),
      feeMinor: s.feeMinor === null ? null : BigInt(s.feeMinor),
    };
  }
  static event(r: PaymentProviderEvent): PaymentEvent {
    return {
      ...r,
      observation: r.observation as unknown as PaymentEvent['observation'],
      outcome: r.outcome as PaymentEvent['outcome'],
    };
  }
  static ledger(r: PaymentLedgerEntry): PaymentLedger {
    return {
      ...r,
      kind: 'capture',
      amountMinor: integer(r.amountMinor),
      platformMinor: integer(r.platformMinor),
      sellerMinor: integer(r.sellerMinor),
    };
  }
  static job(r: PaymentOutboxJob): PaymentJob {
    return {
      ...r,
      kind: r.kind as PaymentJob['kind'],
      status: r.status as PaymentJob['status'],
    };
  }
}
