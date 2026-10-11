import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { RequestDetailStore } from './request-detail.store';
import { PUBLICATIONS_GATEWAY } from '../models/publications-gateway';
import { id } from '../testing/publication.fixture';
import {
  requestDetail as detail,
  requestContext as context,
} from '../testing/request.fixture';
import type { RequestDetail } from '../models/adoption-request';
import { REQUESTS_GATEWAY } from '../models/requests-gateway';
import { ApiProblem } from '../../../core/api';
const command = {
  context,
  action: 'review' as const,
  body: {
    expectedVersion: 1,
    reason: 'Review verified shelter application',
    status: 'approved' as const,
  },
};
function setup(overrides: object = {}) {
  const gateway = {
    get: () => of(detail),
    execute: vi.fn(() =>
      of({
        ...detail,
        request: { ...detail.request, status: 'approved', version: 2 },
      }),
    ),
    audit: () => of({ items: [], total: 0, page: 1, limit: 20 }),
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      RequestDetailStore,
      { provide: REQUESTS_GATEWAY, useValue: gateway },
      { provide: PUBLICATIONS_GATEWAY, useValue: gateway },
    ],
  });
  return { store: TestBed.inject(RequestDetailStore), gateway };
}
describe('Request concurrency and contact privacy', () => {
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
    const pending = new Subject<RequestDetail>(),
      execute = vi.fn(() => pending),
      { store } = setup({ execute });
    store.load(context);
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    store.load({ ...context, publicationId: id(9) });
    pending.next({ ...detail, request: { ...detail.request, version: 2 } });
    pending.complete();
    expect(store.detail()?.request.version).toBe(1);
    expect(store.success()).toBe(false);
  });
  it('retains same-version no-op response as success', () => {
    const { store } = setup({ execute: () => of(detail) });
    store.load(context);
    store.execute(command);
    expect(store.success()).toBe(true);
    expect(store.detail()?.request.version).toBe(1);
  });
  it('clears publication and audit data on detail or audit access loss', () => {
    const { store } = setup();
    store.load(context);
    store.accessFailed(new ApiProblem(403, 'FORBIDDEN', 'Revoked'));
    expect(store.detail()).toBeNull();
    expect(store.audit()).toBeNull();
  });
});
