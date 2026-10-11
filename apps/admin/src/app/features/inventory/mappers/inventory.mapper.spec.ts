import { convertToParamMap } from '@angular/router';
import {
  stockSchema,
  movementBodySchema,
  mapPage,
  mapLedger,
  mapResult,
  parseFilters,
} from './inventory.mapper';
import { rowFixture, resultFixture } from '../testing/inventory.fixture';
describe('Inventory quantities and scoped contracts', () => {
  it('rejects inconsistent balances and malformed movement quantities', () => {
    expect(
      stockSchema.safeParse({ ...rowFixture.stock, reserved: 11 }).success,
    ).toBe(false);
    expect(
      stockSchema.safeParse({ ...rowFixture.stock, available: 8 }).success,
    ).toBe(false);
    const body = {
      kind: 'issue',
      quantity: -1,
      reason: 'Warehouse count verification',
      expectedVersion: 3,
      idempotencyKey: rowFixture.id,
    };
    expect(movementBodySchema.safeParse(body).success).toBe(false);
    expect(
      movementBodySchema.safeParse({ ...body, kind: 'adjustment' }).success,
    ).toBe(true);
    expect(
      movementBodySchema.safeParse({ ...body, kind: 'receipt', quantity: 1.5 })
        .success,
    ).toBe(false);
  });
  it('binds list, ledger and mutation responses to the exact company, variant and command', () => {
    const query = {
      organizationId: rowFixture.organizationId,
      page: 1,
      limit: 20,
    };
    expect(() =>
      mapPage(
        { items: [rowFixture], total: 1, page: 1, limit: 20 },
        { ...query, organizationId: rowFixture.id },
      ),
    ).toThrow();
    const intent = {
      organizationId: rowFixture.organizationId,
      variantId: rowFixture.id,
      body: {
        kind: 'receipt' as const,
        quantity: 2,
        reason: 'Warehouse count verification',
        expectedVersion: 3,
        idempotencyKey: rowFixture.id,
      },
    };
    const result = resultFixture(intent);
    expect(
      mapResult(result, intent.organizationId, intent.variantId, intent.body)
        .stock.onHand,
    ).toBe(12);
    expect(() =>
      mapResult(result, intent.organizationId, intent.variantId, {
        ...intent.body,
        quantity: 3,
      }),
    ).toThrow();
    expect(() =>
      mapLedger(
        { items: [result.movement], total: 1, page: 1, limit: 20 },
        rowFixture.id,
        rowFixture.id,
        1,
        20,
      ),
    ).toThrow();
  });
  it('preserves valid URL filters and refuses missing or malformed company scopes', () => {
    expect(
      parseFilters(
        convertToParamMap({
          organizationId: rowFixture.organizationId,
          search: ' FOOD ',
          status: 'archived',
          page: '2',
          limit: '10',
        }),
      ),
    ).toEqual({
      organizationId: rowFixture.organizationId,
      search: 'FOOD',
      status: 'archived',
      page: 2,
      limit: 10,
    });
    expect(
      parseFilters(convertToParamMap({ organizationId: 'bad' })),
    ).toBeNull();
  });
});
