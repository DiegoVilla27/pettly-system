import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PaymentDetailStore } from './payment-detail.store';
import { PAYMENTS_GATEWAY } from '../models/payments-gateway';
import { payment, policy, id } from '../testing/payment.fixture';
import type { Payment } from '../models/payment';
import { ApiProblem } from '../../../core/api';
const context = { scope: 'platform' as const, paymentId: payment.id };
function setup(overrides: object = {}) {
  const gateway = {
    get: vi.fn(() => of(payment)),
    policy: vi.fn(() => of(policy)),
    reconcile: vi.fn(() => of(payment)),
    history: vi.fn(() => of({ items: [], page: 1, limit: 20, total: 0 })),
    financials: vi.fn(() => of({ events: [], ledger: [] })),
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      PaymentDetailStore,
      { provide: PAYMENTS_GATEWAY, useValue: gateway },
    ],
  });
  return { store: TestBed.inject(PaymentDetailStore), gateway };
}
describe('Payment reconciliation safety', () => {
  it('excludes duplicates and acknowledges queueing without requiring a version increment', () => {
    const pending = new Subject<Payment>(),
      reconcile = vi.fn(() => pending),
      { store } = setup({ reconcile });
    store.load(context);
    store.reconcile(context);
    store.reconcile(context);
    expect(reconcile).toHaveBeenCalledTimes(1);
    pending.next(payment);
    pending.complete();
    expect(store.requested()).toBe(true);
    expect(store.payment()?.version).toBe(1);
    expect(store.refreshRequired()).toBe(true);
    store.reconcile(context);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });
  it.each([0, 409, 502, 503])(
    'requires explicit refresh after failure %s',
    (status) => {
      const reconcile = vi.fn(() =>
          throwError(() => new ApiProblem(status, 'ERROR', 'Unknown')),
        ),
        { store } = setup({ reconcile });
      store.load(context);
      store.reconcile(context);
      expect(store.refreshRequired()).toBe(true);
      store.reconcile(context);
      expect(reconcile).toHaveBeenCalledTimes(1);
      store.load(context);
      expect(store.refreshRequired()).toBe(false);
    },
  );
  it('disables provider mismatch and unavailable policy while preserving detail', () => {
    const reconcile = vi.fn(() => of(payment)),
      { store } = setup({
        policy: () =>
          throwError(() => new ApiProblem(503, 'ERROR', 'Unavailable')),
        reconcile,
      });
    store.load(context);
    expect(store.payment()).toEqual(payment);
    store.reconcile(context);
    expect(reconcile).not.toHaveBeenCalled();
    expect(store.policyProblem()).not.toBeNull();
  });
  it.each([false, true])(
    'rejects disabled or incompatible providers (enabled=%s)',
    (enabled) => {
      const reconcile = vi.fn(() => of(payment)),
        { store } = setup({
          policy: () =>
            of({
              ...policy,
              providerEnabled: enabled,
              provider: enabled ? 'other' : policy.provider,
            }),
          reconcile,
        });
      store.load(context);
      store.reconcile(context);
      expect(reconcile).not.toHaveBeenCalled();
    },
  );
  it('clears detail if current policy reveals revoked access', () => {
    const { store } = setup({
      policy: () =>
        throwError(() => new ApiProblem(403, 'FORBIDDEN', 'Revoked')),
    });
    store.load(context);
    expect(store.payment()).toBeNull();
    expect(store.problem()?.status).toBe(403);
  });
  it('does not apply a late command response to another route', () => {
    const pending = new Subject<Payment>(),
      { store } = setup({ reconcile: () => pending });
    store.load(context);
    store.reconcile(context);
    store.load({ ...context, paymentId: id(9) });
    pending.next({ ...payment, status: 'approved' });
    pending.complete();
    expect(store.requested()).toBe(false);
    expect(store.payment()?.status).toBe('created');
  });
  it('clears private detail and evidence when history access is revoked', () => {
    const { store } = setup({
      history: () =>
        throwError(() => new ApiProblem(403, 'FORBIDDEN', 'Revoked')),
    });
    store.load(context);
    store.loadEvidence(context);
    store.loadHistory({ context, page: 1, version: 1 });
    expect(store.payment()).toBeNull();
    expect(store.evidence()).toBeNull();
    expect(store.policy()).toBeNull();
  });
  it('does not repopulate private evidence after a parallel history request loses access', () => {
    const evidence = new Subject<{ events: []; ledger: [] }>();
    const { store } = setup({
      financials: () => evidence,
      history: () =>
        throwError(() => new ApiProblem(403, 'FORBIDDEN', 'Revoked')),
    });
    store.load(context);
    store.loadEvidence(context);
    store.loadHistory({ context, page: 1, version: 1 });
    evidence.next({ events: [], ledger: [] });
    evidence.complete();
    expect(store.payment()).toBeNull();
    expect(store.evidence()).toBeNull();
  });
  it('cancels obsolete reads and never displays previous context data', () => {
    const pending = new Subject<Payment>(),
      { store } = setup({ get: () => pending });
    store.load(context);
    store.load(null);
    pending.next(payment);
    expect(store.payment()).toBeNull();
    expect(store.loading()).toBe(false);
  });
});
