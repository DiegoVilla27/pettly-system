import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { AnimalCreateStore } from './animal-create.store';
import { ANIMALS_GATEWAY } from '../models/animals-gateway';
import { profile, animal, context } from '../testing/animal.fixture';
import { ApiProblem } from '../../../core/api';
const input = {
  organizationId: context.organizationId,
  profile,
  reason: 'Animal registration verified',
};
describe('Non-idempotent animal creation', () => {
  it('excludes duplicate registration while pending and after confirmed creation', () => {
    const pending = new Subject<typeof animal>(),
      create = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        AnimalCreateStore,
        { provide: ANIMALS_GATEWAY, useValue: { create } },
      ],
    });
    const store = TestBed.inject(AnimalCreateStore);
    store.create(input);
    store.create(input);
    pending.next(animal);
    pending.complete();
    store.create(input);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('prevents replay after uncertain create rather than risking another animal', () => {
    const create = vi.fn(() =>
      throwError(() => new ApiProblem(0, 'NETWORK', 'Lost')),
    );
    TestBed.configureTestingModule({
      providers: [
        AnimalCreateStore,
        { provide: ANIMALS_GATEWAY, useValue: { create } },
      ],
    });
    const store = TestBed.inject(AnimalCreateStore);
    store.create(input);
    store.create(input);
    expect(store.uncertain()).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
