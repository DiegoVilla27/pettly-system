import { convertToParamMap } from '@angular/router';
import {
  mapPayment,
  mapPage,
  mapFinancials,
  mapHistory,
  mapPolicy,
  parseFilters,
} from './payments.mapper';
import { paymentDto as p, id, policy } from '../testing/payment.fixture';
const context = { scope: 'platform' as const, paymentId: p.id };
describe('Payment contract invariants', () => {
  it('keeps accepted commission and omits arbitrary checkout links', () => {
    const result = mapPayment({ ...p, checkoutUrl: 'https://evil.test' });
    expect(result.allocation.rateBasisPoints).toBe(1000);
    expect(result).not.toHaveProperty('checkoutUrl');
    expect(mapPolicy(policy).percent).toBe(20);
  });
  it('rejects unsafe money, malformed splits and foreign detail context', () => {
    expect(() =>
      mapPayment({ ...p, amountMinor: Number.MAX_SAFE_INTEGER + 1 }),
    ).toThrow();
    expect(() =>
      mapPayment({ ...p, allocation: { ...p.allocation, sellerMinor: 1 } }),
    ).toThrow();
    expect(() =>
      mapPayment(p, {
        scope: 'business',
        organizationId: id(8),
        paymentId: p.id,
      }),
    ).toThrow();
  });
  it('uses exact half-up calculations at the safe-integer boundary', () => {
    const amount = Number.MAX_SAFE_INTEGER;
    expect(
      mapPayment({
        ...p,
        amountMinor: amount,
        allocation: {
          ...p.allocation,
          baseMinor: amount,
          platformMinor: Number((BigInt(amount) * 1000n + 5000n) / 10000n),
          sellerMinor:
            amount - Number((BigInt(amount) * 1000n + 5000n) / 10000n),
          totalMinor: amount,
        },
      }).amountMinor,
    ).toBe(amount);
  });
  it('rejects mixed scopes and malformed URL pagination without own-buyer fallback', () => {
    expect(
      parseFilters(
        convertToParamMap({
          scope: 'platform',
          organizationId: p.organizationId,
        }),
        true,
      ),
    ).toBeNull();
    expect(
      parseFilters(convertToParamMap({ scope: 'business' }), false),
    ).toBeNull();
    expect(
      parseFilters(convertToParamMap({ scope: 'platform', page: 'NaN' }), true),
    ).toBeNull();
  });
  it('checks requested status, scope, limits and duplicate attempts', () => {
    const q = {
      scope: 'business' as const,
      organizationId: p.organizationId,
      page: 1,
      limit: 20,
      status: 'created' as const,
    };
    expect(mapPage({ items: [p], total: 1, page: 1, limit: 20 }, q).total).toBe(
      1,
    );
    expect(() =>
      mapPage({ items: [p, p], total: 2, page: 1, limit: 20 }, q),
    ).toThrow();
    expect(() =>
      mapPage(
        { items: [{ ...p, status: 'approved' }], total: 1, page: 1, limit: 20 },
        q,
      ),
    ).toThrow();
  });
  it('preserves mismatched provider observations as evidence without changing accepted allocation', () => {
    const dto = {
      events: [
        {
          id: id(9),
          paymentId: p.id,
          provider: 'test',
          eventId: 'evt',
          observation: {
            eventId: 'evt',
            reference: 'different',
            paymentId: id(10),
            amountMinor: 1,
            currency: 'USD',
            status: 'approved',
            distributionStatus: 'pending',
            feeMinor: null,
          },
          outcome: 'reconciliation_required',
          createdAt: p.createdAt,
        },
      ],
      ledger: [],
    };
    const result = mapFinancials(dto, context);
    expect(result.events[0]?.observation.currency).toBe('USD');
    expect(p.amountMinor).toBe(13000);
    expect(() =>
      mapFinancials(
        { ...dto, events: [{ ...dto.events[0], paymentId: id(12) }] },
        context,
      ),
    ).toThrow();
  });
  it('allows repeated audit versions but rejects another payment and duplicate records', () => {
    const a = {
      id: id(9),
      paymentId: p.id,
      version: 1,
      action: 'reconciliation_requested',
      actorId: null,
      requestId: id(10),
      createdAt: p.createdAt,
    };
    expect(
      mapHistory(
        { items: [a, { ...a, id: id(11) }], page: 1, limit: 20, total: 2 },
        context,
        1,
      ).items,
    ).toHaveLength(2);
    expect(() =>
      mapHistory(
        { items: [{ ...a, paymentId: id(12) }], page: 1, limit: 20, total: 1 },
        context,
        1,
      ),
    ).toThrow();
  });
  it('treats unknown fee differently from zero and rejects inconsistent policy and ledger', () => {
    expect(mapPayment(p).feeMinor).toBeNull();
    expect(mapPayment({ ...p, feeMinor: 0 }).feeMinor).toBe(0);
    expect(() => mapPolicy({ ...policy, percent: 10 })).toThrow();
    expect(() =>
      mapFinancials(
        {
          events: [],
          ledger: [
            {
              id: id(8),
              paymentId: p.id,
              eventId: id(9),
              kind: 'capture',
              amountMinor: 10,
              platformMinor: 1,
              sellerMinor: 1,
              createdAt: p.createdAt,
            },
          ],
        },
        context,
      ),
    ).toThrow();
  });
});
