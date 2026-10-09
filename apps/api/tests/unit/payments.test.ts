import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import {
  allocatePayment,
  percentageToBasisPoints,
  validateAllocation,
} from '../../src/shared/domain/payment-allocation';
import {
  Payment,
  type PaymentState,
  type ProviderObservation,
} from '../../src/modules/payments/domain/aggregates/payment';
import {
  CreatePaymentDto,
  ListPaymentsDto,
  ReconcilePaymentDto,
} from '../../src/modules/payments/adapters/in/http/dtos/requests/payments.requests';
import { PaymentsHandlers } from '../../src/modules/payments/application/handlers/payments.handlers';
import { EnvironmentCommissionPolicy } from '../../src/modules/payments/adapters/out/config/environment-commission-policy';
import type {
  PaymentsWork,
  PaymentsRepository,
} from '../../src/modules/payments/application/ports/out/payments-repository';
import type {
  PaymentAudit,
  PaymentEvent,
  PaymentLedger,
  PaymentJob,
} from '../../src/modules/payments/application/results/payment';
import type { OrderPayments } from '../../src/modules/orders/application/ports/in/order-payments';
import type { OrderState } from '../../src/modules/orders/application/results/order';
import type { Authorization } from '../../src/modules/authorization/application/ports/in/authorization';
import type { OrganizationAccess } from '../../src/modules/organizations/application/ports/in/organization-access';
import type { PaymentProvider } from '../../src/modules/payments/application/ports/out/payment-provider';
const now = new Date('2026-10-09T12:00:00Z');
const state = (): PaymentState => ({
  id: randomUUID(),
  orderId: randomUUID(),
  buyerId: randomUUID(),
  organizationId: randomUUID(),
  idempotencyKey: randomUUID(),
  provider: 'test',
  reference: null,
  checkoutUrl: null,
  status: 'created',
  distributionStatus: 'unconfirmed',
  allocation: allocatePayment(10000, 13000, 1000),
  amountMinor: 13000,
  currency: 'COP',
  feeMinor: null,
  version: 1,
  expiresAt: new Date(+now + 1800000),
  createdAt: now,
  updatedAt: now,
});
function observation(
  p: PaymentState,
  patch: Partial<ProviderObservation> = {},
): ProviderObservation {
  return {
    eventId: randomUUID(),
    reference: 'test-' + p.id,
    paymentId: p.id,
    amountMinor: p.amountMinor,
    currency: 'COP',
    status: 'approved',
    distributionStatus: 'pending',
    feeMinor: null,
    ...patch,
  };
}
test('commission parses exact decimal percentages and rejects invalid environment values', () => {
  assert.equal(percentageToBasisPoints('10'), 1000);
  assert.equal(percentageToBasisPoints('12.34'), 1234);
  assert.equal(percentageToBasisPoints('0'), 0);
  assert.equal(percentageToBasisPoints('100.00'), 10000);
  for (const v of ['-1', '100.01', '10.001', 'NaN', '1e1', ' 10', '', '10%'])
    assert.throws(() => percentageToBasisPoints(v));
});
test('allocation preserves exact total and uses half-up integer arithmetic without floating overflow', () => {
  assert.equal(allocatePayment(5, 10, 1000).platformMinor, 1);
  assert.equal(allocatePayment(4, 10, 1000).platformMinor, 0);
  assert.equal(allocatePayment(10000, 13000, 1000).sellerMinor, 12000);
  for (const rate of [0, 1, 1000, 9999, 10000])
    for (const base of [1, 999, Number.MAX_SAFE_INTEGER]) {
      const a = allocatePayment(base, base, rate);
      validateAllocation(a);
      assert.equal(a.platformMinor + a.sellerMinor, base);
    }
  assert.throws(() => allocatePayment(11, 10, 1000));
  assert.throws(() => allocatePayment(1, 1, 10001));
  assert.throws(() =>
    validateAllocation({
      ...allocatePayment(100, 100, 1000),
      platformMinor: 1,
    }),
  );
});
test('accepted payment allocations are detached and cannot be replaced by a later commission', () => {
  const s = state(),
    p = Payment.create(s);
  s.allocation.platformMinor = 1;
  p.snapshot().allocation.platformMinor = 2;
  assert.equal(p.snapshot().allocation.platformMinor, 1000);
  assert.equal(
    new EnvironmentCommissionPolicy(2000).allocate(10000, 13000).platformMinor,
    2000,
  );
  assert.throws(() => Payment.create({ ...state(), currency: 'USD' as 'COP' }));
});
test('unsubmitted attempts expire safely but ambiguous submitted attempts must be reconciled', () => {
  const p = Payment.create(state());
  assert.equal(p.expire(new Date(+now + 1799999)), false);
  assert.equal(p.expire(new Date(+now + 1800000)), true);
  const submitted = Payment.create(state());
  submitted.processing(now);
  assert.equal(submitted.expire(new Date(+now + 3600000)), false);
  assert.equal(submitted.snapshot().status, 'processing');
});
test('provider approval and seller distribution are separate and old events cannot erase confirmed money', () => {
  const s = state(),
    p = Payment.create(s);
  p.processing(now);
  p.session('test-' + s.id, 'https://checkout.test/pay', now);
  p.observe(observation(s), true, now);
  assert.equal(p.snapshot().status, 'approved');
  assert.equal(p.snapshot().distributionStatus, 'pending');
  p.observe(
    observation(s, { distributionStatus: 'distributed', feeMinor: 200 }),
    true,
    now,
  );
  p.observe(observation(s, { status: 'pending' }), false, now);
  p.observe(observation(s), true, now);
  assert.equal(p.snapshot().status, 'approved');
  assert.equal(p.snapshot().distributionStatus, 'distributed');
  assert.equal(p.snapshot().feeMinor, 200);
});
test('late approvals, mismatched currency/amount/reference and malformed provider records require reconciliation', () => {
  for (const patch of [
    { amountMinor: 1 },
    { currency: 'USD' },
    { paymentId: randomUUID() },
    { reference: 'wrong' },
  ]) {
    const s = state(),
      p = Payment.create(s);
    p.processing(now);
    p.session('test-' + s.id, 'https://checkout.test', now);
    assert.equal(
      p.observe(observation(s, patch), true, now),
      'reconciliation_required',
    );
  }
  const s = state(),
    p = Payment.create(s);
  p.processing(now);
  assert.equal(
    p.observe(observation(s), false, now),
    'reconciliation_required',
  );
  assert.throws(() => p.observe(observation(s, { feeMinor: -1 }), false, now));
  assert.throws(() => p.session('reference', 'http://checkout.test', now));
});
test('payment request DTOs forbid client money, recipients, status and webhook impersonation', () => {
  const body = { idempotencyKey: randomUUID() };
  assert.equal(CreatePaymentDto.schema.safeParse(body).success, true);
  for (const patch of [
    { amountMinor: 1 },
    { status: 'approved' },
    { buyerId: randomUUID() },
    { rateBasisPoints: 0 },
    { recipients: [] },
  ])
    assert.equal(
      CreatePaymentDto.schema.safeParse({ ...body, ...patch }).success,
      false,
    );
  assert.equal(
    ReconcilePaymentDto.schema.safeParse({ status: 'approved' }).success,
    false,
  );
  assert.equal(
    ListPaymentsDto.schema.safeParse({ scope: 'platform', limit: 51 }).success,
    false,
  );
});
function fixture() {
  let current = now,
    inTransaction = false,
    calls = 0,
    failCheckout = false;
  const original = state();
  const order = {
    id: original.orderId,
    buyerId: original.buyerId,
    organizationId: original.organizationId,
    status: 'awaiting_payment',
    expiresAt: original.expiresAt,
    currency: 'COP',
    totalMinor: original.amountMinor,
    paymentId: null,
    snapshot: {
      contact: { countryCode: 'CO' },
      commission: original.allocation,
    },
  } as unknown as OrderState;
  const payments = new Map<string, PaymentState>(),
    jobs = new Map<string, PaymentJob>(),
    events = new Map<string, PaymentEvent>(),
    ledger = new Map<string, PaymentLedger>(),
    audits: PaymentAudit[] = [];
  const work: PaymentsWork = {
    lock: async () => undefined,
    payment: async (id) => payments.get(id) ?? null,
    replay: async (buyer, key) =>
      [...payments.values()].find(
        (p) => p.buyerId === buyer && p.idempotencyKey === key,
      ) ?? null,
    active: async (id) =>
      [...payments.values()].find(
        (p) =>
          p.orderId === id &&
          !['declined', 'cancelled', 'expired'].includes(p.status),
      ) ?? null,
    save: async (p) => {
      payments.set(p.id, structuredClone(p));
    },
    audit: async (a) => {
      audits.push(a);
    },
    list: async () => ({
      items: [...payments.values()],
      total: payments.size,
      page: 1,
      limit: 20,
    }),
    history: async () => ({
      items: audits,
      total: audits.length,
      page: 1,
      limit: 20,
    }),
    event: async (provider, id) => events.get(provider + id) ?? null,
    saveEvent: async (e) => {
      events.set(e.provider + e.eventId, e);
    },
    capture: async (id) => ledger.get(id) ?? null,
    saveLedger: async (l) => {
      ledger.set(l.paymentId, l);
    },
    financials: async () => ({
      events: [...events.values()],
      ledger: [...ledger.values()],
    }),
    job: async (id) => jobs.get(id) ?? null,
    jobFor: async (id, kind) =>
      [...jobs.values()].find((j) => j.paymentId === id && j.kind === kind) ??
      null,
    saveJob: async (j) => {
      jobs.set(j.id, structuredClone(j));
    },
    due: async (date) =>
      [...jobs.values()].filter(
        (j) =>
          j.status !== 'done' &&
          j.nextAt <= date &&
          (!j.leaseUntil || j.leaseUntil <= date),
      ),
  };
  const repo: PaymentsRepository = {
    run: async (fn) => {
      inTransaction = true;
      try {
        return await fn(work);
      } finally {
        inTransaction = false;
      }
    },
  };
  const orders: OrderPayments = {
    forPayment: async () => order,
    inspect: async () => order,
    settleVerified: async (_id, paymentId) => {
      calls++;
      order.status = 'paid';
      order.paymentId = paymentId;
      return order;
    },
  };
  const auth = {
    requirePermission: async () => undefined,
  } as unknown as Authorization;
  let obs: Partial<ProviderObservation> = { eventId: 'approval-1' };
  const provider: PaymentProvider = {
    name: 'test',
    enabled: true,
    createCheckout: async (p) => {
      assert.equal(inTransaction, false);
      if (failCheckout) throw new Error('Ambiguous timeout');
      return {
        reference: 'test-' + p.id,
        url: 'https://checkout.test/' + p.id,
      };
    },
    lookup: async (p) => {
      assert.equal(inTransaction, false);
      return observation(p, obs);
    },
  };
  const entropy = {
    id: randomUUID,
    token: randomUUID,
    digest: (s: string) => createHash('sha256').update(s).digest('hex'),
  };
  const handlers = new PaymentsHandlers(
    repo,
    orders,
    auth,
    provider,
    new EnvironmentCommissionPolicy(2000),
    { now: () => current },
    entropy,
    {
      findOrganization: async () => ({
        status: 'active',
        type: 'business',
        countryCode: 'CO',
      }),
    } as unknown as OrganizationAccess,
  );
  return {
    original,
    order,
    payments,
    jobs,
    events,
    ledger,
    handlers,
    calls: () => calls,
    advance: (ms: number) => {
      current = new Date(+current + ms);
    },
    observation: (o: Partial<ProviderObservation>) => {
      obs = o;
    },
    failCheckout: () => {
      failCheckout = true;
    },
  };
}
test('application snapshots accepted order terms, replays idempotently and rejects replacement unresolved attempts', async () => {
  const f = fixture(),
    cmd = {
      actorId: f.original.buyerId,
      orderId: f.original.orderId,
      idempotencyKey: randomUUID(),
      requestId: randomUUID(),
    };
  const p = await f.handlers.create(cmd);
  assert.equal(p.allocation.rateBasisPoints, 1000);
  assert.equal((await f.handlers.create(cmd)).id, p.id);
  assert.equal(f.jobs.size, 1);
  await assert.rejects(
    f.handlers.create({ ...cmd, idempotencyKey: randomUUID() }),
  );
});
test('outbox calls provider outside transactions and records capture once despite repeated distinct events', async () => {
  const f = fixture(),
    p = await f.handlers.create({
      actorId: f.original.buyerId,
      orderId: f.original.orderId,
      idempotencyKey: randomUUID(),
      requestId: randomUUID(),
    });
  await f.handlers.runDue();
  await f.handlers.runDue();
  assert.equal(f.payments.get(p.id)?.status, 'approved');
  assert.equal(f.ledger.size, 1);
  assert.equal(f.calls(), 1);
  f.advance(31000);
  await f.handlers.runDue();
  assert.equal(f.ledger.size, 1);
  assert.equal(f.calls(), 1);
  f.observation({
    eventId: 'distributed-2',
    distributionStatus: 'distributed',
    feeMinor: 100,
  });
  f.advance(31000);
  await f.handlers.runDue();
  assert.equal(f.ledger.size, 1);
  assert.equal(f.payments.get(p.id)?.distributionStatus, 'distributed');
});
test('ambiguous checkout retries use lookup rather than creating another checkout', async () => {
  const f = fixture();
  f.failCheckout();
  const p = await f.handlers.create({
    actorId: f.original.buyerId,
    orderId: f.original.orderId,
    idempotencyKey: randomUUID(),
    requestId: randomUUID(),
  });
  await f.handlers.runDue();
  assert.equal(f.payments.get(p.id)?.status, 'processing');
  f.advance(10000);
  await f.handlers.runDue();
  assert.equal(f.payments.get(p.id)?.status, 'approved');
  assert.equal(f.calls(), 1);
});
test('collected late funds remain recorded without resurrecting expired orders or consuming stock', async () => {
  const f = fixture(),
    p = await f.handlers.create({
      actorId: f.original.buyerId,
      orderId: f.original.orderId,
      idempotencyKey: randomUUID(),
      requestId: randomUUID(),
    });
  await f.handlers.runDue();
  f.advance(1801000);
  f.order.status = 'expired';
  await f.handlers.runDue();
  assert.equal(f.payments.get(p.id)?.status, 'reconciliation_required');
  assert.equal(f.ledger.size, 1);
  assert.equal(f.calls(), 0);
});
