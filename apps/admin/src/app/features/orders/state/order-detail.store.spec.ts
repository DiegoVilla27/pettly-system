import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ORDERS_GATEWAY } from '../models/orders-gateway';
import { OrderDetailStore } from './order-detail.store';
import { order } from '../testing/order.fixture';
import type { Order } from '../models/order';
import { ApiProblem } from '../../../core/api';
const context = {
    organizationId: order.organizationId,
    orderId: order.id,
  },
  command = {
    context,
    action: 'cancel' as const,
    body: { expectedVersion: 1, reason: 'Provider confirmation verification' },
  };
describe('Order mutation concurrency', () => {
  it('excludes duplicates and freezes manual replay after conflicts or uncertain outcomes', () => {
    const pending = new Subject<Order>(),
      execute = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        OrderDetailStore,
        {
          provide: ORDERS_GATEWAY,
          useValue: { get: () => of(order), execute },
        },
      ],
    });
    const store = TestBed.inject(OrderDetailStore);
    store.load(context);
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(409, 'CONFLICT', 'Changed'));
    store.execute(command);
    expect(store.refreshRequired()).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
    store.load(context);
    expect(store.refreshRequired()).toBe(false);
  });
  it('requires explicit refresh after transport loss and ignores late writes on a changed route', () => {
    const pending = new Subject<Order>(),
      execute = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        OrderDetailStore,
        {
          provide: ORDERS_GATEWAY,
          useValue: { get: () => of(order), execute },
        },
      ],
    });
    const store = TestBed.inject(OrderDetailStore);
    store.load(context);
    store.execute(command);
    pending.error(new ApiProblem(0, 'NETWORK', 'Unknown'));
    expect(store.refreshRequired()).toBe(true);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('does not apply a successful decision to another route', () => {
    const pending = new Subject<Order>();
    TestBed.configureTestingModule({
      providers: [
        OrderDetailStore,
        {
          provide: ORDERS_GATEWAY,
          useValue: { get: () => of(order), execute: () => pending },
        },
      ],
    });
    const store = TestBed.inject(OrderDetailStore);
    store.load(context);
    store.execute(command);
    store.load({ ...context, orderId: order.buyerId });
    pending.next({
      ...order,
      status: 'cancelled',
      version: 2,
    });
    pending.complete();
    expect(store.success()).toBeNull();
    expect(store.order()?.version).toBe(1);
  });
});
