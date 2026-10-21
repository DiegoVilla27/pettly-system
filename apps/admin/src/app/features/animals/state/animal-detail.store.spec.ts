import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AnimalDetailStore } from './animal-detail.store';
import { ANIMALS_GATEWAY } from '../models/animals-gateway';
import { animal, context, id } from '../testing/animal.fixture';
import type { Animal } from '../models/animal';
import { ApiProblem } from '../../../core/api';
const command = {
  context,
  action: 'archive' as const,
  body: { expectedVersion: 1, reason: 'Archive verified shelter animal' },
};
function setup(overrides: object = {}) {
  const gateway = {
    get: () => of(animal),
    execute: vi.fn(() =>
      of({
        ...animal,
        status: 'archived',
        version: 2,
        archivedAt: animal.createdAt,
      }),
    ),
    audit: () => of({ items: [], total: 0, page: 1, limit: 20 }),
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      AnimalDetailStore,
      { provide: ANIMALS_GATEWAY, useValue: gateway },
    ],
  });
  return { store: TestBed.inject(AnimalDetailStore), gateway };
}
describe('Animal commands and privacy', () => {
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
    const pending = new Subject<Animal>(),
      execute = vi.fn(() => pending),
      { store } = setup({ execute });
    store.load(context);
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    store.load({ ...context, animalId: id(9) });
    pending.next({ ...animal, version: 2 });
    pending.complete();
    expect(store.animal()?.version).toBe(1);
    expect(store.success()).toBe(false);
  });
  it('retains same-version no-op response as success', () => {
    const { store } = setup({ execute: () => of(animal) });
    store.load(context);
    store.execute(command);
    expect(store.success()).toBe(true);
    expect(store.animal()?.version).toBe(1);
  });
  it('clears clinical and audit data on photo or audit access loss', () => {
    const { store } = setup();
    store.load(context);
    store.accessFailed(new ApiProblem(403, 'FORBIDDEN', 'Revoked'));
    expect(store.animal()).toBeNull();
    expect(store.audit()).toBeNull();
  });
});
