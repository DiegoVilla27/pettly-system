import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PublicationDetailStore } from './publication-detail.store';
import { PUBLICATIONS_GATEWAY } from '../models/publications-gateway';
import { publication, context, id } from '../testing/publication.fixture';
import type { Publication } from '../models/publication';
import { ApiProblem } from '../../../core/api';
const command = {
  context,
  action: 'archive' as const,
  body: { expectedVersion: 1, reason: 'Archive verified shelter publication' },
};
function setup(overrides: object = {}) {
  const gateway = {
    get: () => of(publication),
    execute: vi.fn(() =>
      of({
        ...publication,
        status: 'deleted',
        version: 2,
        deletedAt: publication.createdAt,
      }),
    ),
    audit: () => of({ items: [], total: 0, page: 1, limit: 20 }),
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      PublicationDetailStore,
      { provide: PUBLICATIONS_GATEWAY, useValue: gateway },
    ],
  });
  return { store: TestBed.inject(PublicationDetailStore), gateway };
}
describe('Publication commands and privacy', () => {
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
    const pending = new Subject<Publication>(),
      execute = vi.fn(() => pending),
      { store } = setup({ execute });
    store.load(context);
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    store.load({ ...context, publicationId: id(9) });
    pending.next({ ...publication, version: 2 });
    pending.complete();
    expect(store.publication()?.version).toBe(1);
    expect(store.success()).toBe(false);
  });
  it('retains same-version no-op response as success', () => {
    const { store } = setup({ execute: () => of(publication) });
    store.load(context);
    store.execute(command);
    expect(store.success()).toBe(true);
    expect(store.publication()?.version).toBe(1);
  });
  it('clears publication and audit data on photo or audit access loss', () => {
    const { store } = setup();
    store.load(context);
    store.accessFailed(new ApiProblem(403, 'FORBIDDEN', 'Revoked'));
    expect(store.publication()).toBeNull();
    expect(store.audit()).toBeNull();
  });
});
