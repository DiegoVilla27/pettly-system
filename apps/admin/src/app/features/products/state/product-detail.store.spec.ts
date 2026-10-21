import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ProductDetailStore } from './product-detail.store';
import { PRODUCTS_GATEWAY } from '../models/products-gateway';
import { detail, context, id } from '../testing/product.fixture';
import type { ProductDetail } from '../models/product';
import { ApiProblem } from '../../../core/api';
const command = {
  context,
  action: 'archive' as const,
  body: { expectedVersion: 1, reason: 'Archive verified company product' },
};
function setup(overrides: object = {}) {
  const gateway = {
    get: () => of(detail),
    execute: vi.fn(() =>
      of({
        ...detail,
        product: { ...detail.product, status: 'archived', version: 2 },
      }),
    ),
    audit: () => of({ items: [], total: 0, page: 1, limit: 20 }),
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      ProductDetailStore,
      { provide: PRODUCTS_GATEWAY, useValue: gateway },
    ],
  });
  return { store: TestBed.inject(ProductDetailStore), gateway };
}
describe('Product commands and privacy', () => {
  it.each([0, 409, 503])(
    'freezes replay after conflict/uncertainty %s',
    (status) => {
      const execute = vi.fn(() =>
          throwError(() => new ApiProblem(status, 'ERROR', 'Unknown')),
        ),
        { store } = setup({ execute });
      store.load(context);
      store.execute(command);
      store.execute(command);
      expect(execute).toHaveBeenCalledTimes(1);
      expect(store.refreshRequired()).toBe(true);
      store.load(context);
      expect(store.refreshRequired()).toBe(false);
    },
  );
  it('excludes duplicate writes and ignores late results after route changes', () => {
    const pending = new Subject<ProductDetail>(),
      execute = vi.fn(() => pending),
      { store } = setup({ execute });
    store.load(context);
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    store.load({ ...context, productId: id(9) });
    pending.next({ ...detail, product: { ...detail.product, version: 2 } });
    pending.complete();
    expect(store.detail()?.product.version).toBe(1);
    expect(store.success()).toBe(false);
  });
  it('retains same-version no-op response as success', () => {
    const { store } = setup({ execute: () => of(detail) });
    store.load(context);
    store.execute(command);
    expect(store.success()).toBe(true);
    expect(store.detail()?.product.version).toBe(1);
  });
  it('clears product and audit data on photo or audit access loss', () => {
    const { store } = setup();
    store.load(context);
    store.accessFailed(new ApiProblem(403, 'FORBIDDEN', 'Revoked'));
    expect(store.detail()).toBeNull();
    expect(store.audit()).toBeNull();
  });
  it('does not restore private detail after access loss during a pending write', () => {
    const pending = new Subject<ProductDetail>(),
      { store } = setup({ execute: () => pending });
    store.load(context);
    store.execute(command);
    store.accessFailed(new ApiProblem(403, 'FORBIDDEN', 'Revoked'));
    pending.next(detail);
    pending.complete();
    expect(store.detail()).toBeNull();
    expect(store.success()).toBe(false);
  });
});
