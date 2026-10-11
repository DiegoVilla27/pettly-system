import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { INVENTORY_GATEWAY } from '../models/inventory-gateway';
import { InventoryDetailStore } from './inventory-detail.store';
import { ApiProblem } from '../../../core/api';
import { rowFixture, resultFixture } from '../testing/inventory.fixture';
import type { MovementIntent, MovementResult } from '../models/inventory';
const context = {
  organizationId: rowFixture.organizationId,
  variantId: rowFixture.id,
};
const input = {
  kind: 'receipt' as const,
  quantity: 2,
  reason: 'Warehouse count verification',
};
describe('Durable inventory command intent', () => {
  it('excludes duplicate writes and retries an uncertain result with the original immutable body/key', () => {
    const first = new Subject<MovementResult>(),
      second = new Subject<MovementResult>();
    const movement = vi
      .fn<(intent: MovementIntent) => Subject<MovementResult>>()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    TestBed.configureTestingModule({
      providers: [
        InventoryDetailStore,
        {
          provide: INVENTORY_GATEWAY,
          useValue: { detail: () => of(rowFixture), movement },
        },
      ],
    });
    const store = TestBed.inject(InventoryDetailStore);
    store.load(context);
    store.record(input);
    store.record(input);
    expect(movement).toHaveBeenCalledTimes(1);
    const original = store.intent();
    expect(original).not.toBeNull();
    first.error(new ApiProblem(0, 'NETWORK', 'Private transport error'));
    expect(store.uncertain()).toBe(true);
    store.record({ ...input, quantity: 4 });
    expect(movement).toHaveBeenCalledTimes(1);
    store.record(null);
    expect(movement.mock.calls[1]?.[0]).toEqual(original);
    if (!original) throw Error('Missing intent');
    second.next(resultFixture(original));
    second.complete();
    expect(store.intent()).toBeNull();
    expect(store.uncertain()).toBe(false);
    expect(store.row()?.stock.onHand).toBe(12);
  });
  it('keeps stale stock after a definitive conflict and ignores a late result after changing scope', () => {
    const pending = new Subject<MovementResult>();
    const movement = vi.fn(() => pending),
      detail = vi.fn(() => of(rowFixture));
    TestBed.configureTestingModule({
      providers: [
        InventoryDetailStore,
        { provide: INVENTORY_GATEWAY, useValue: { detail, movement } },
      ],
    });
    const store = TestBed.inject(InventoryDetailStore);
    store.load(context);
    store.record(input);
    pending.error(new ApiProblem(409, 'CONFLICT', 'Private details'));
    expect(store.row()?.stock.version).toBe(3);
    expect(store.intent()).toBeNull();
    expect(store.problem()?.message).toContain('Actualiza el inventario');
    expect(detail).toHaveBeenCalledTimes(1);
  });
  it('does not apply a late movement to a different variant', () => {
    const pending = new Subject<MovementResult>();
    TestBed.configureTestingModule({
      providers: [
        InventoryDetailStore,
        {
          provide: INVENTORY_GATEWAY,
          useValue: { detail: () => of(rowFixture), movement: () => pending },
        },
      ],
    });
    const store = TestBed.inject(InventoryDetailStore);
    store.load(context);
    store.record(input);
    const original = store.intent();
    if (!original) throw Error('Missing intent');
    store.load({ ...context, variantId: rowFixture.productId });
    pending.next(resultFixture(original));
    pending.complete();
    expect(store.result()).toBeNull();
    expect(store.intent()).toBeNull();
  });
});
