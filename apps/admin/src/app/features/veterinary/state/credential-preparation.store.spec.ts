import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { CredentialPreparationStore } from './credential-preparation.store';
import { VETERINARY_GATEWAY } from '../models/veterinary-gateway';
import { credentialFixture } from '../testing/credential.fixture';
import { mapCredential } from '../mappers/veterinary.mapper';
import type { Credential, PreparationCommand } from '../models/credential';
import { ApiProblem } from '../../../core/api';
const command: PreparationCommand = {
  kind: 'submit',
  credentialId: credentialFixture.id,
  body: { expectedVersion: 5, reason: 'Preparación acreditada para revisión' },
};
describe('Credential preparation write safety', () => {
  function setup() {
    const pending = new Subject<Credential>();
    const prepare = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        CredentialPreparationStore,
        {
          provide: VETERINARY_GATEWAY,
          useValue: {
            get: () => of(mapCredential(credentialFixture)),
            prepare,
          },
        },
      ],
    });
    return {
      store: TestBed.inject(CredentialPreparationStore),
      pending,
      prepare,
    };
  }
  it('validates loaded identity/version and freezes unknown outcomes', () => {
    const { store, pending, prepare } = setup();
    store.load(credentialFixture.id);
    store.execute({ ...command, credentialId: crypto.randomUUID() });
    expect(prepare).not.toHaveBeenCalled();
    store.execute(command);
    store.execute(command);
    expect(prepare).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(0, 'NETWORK', 'Unknown outcome'));
    store.execute(command);
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(store.refreshRequired()).toBe(true);
  });
  it('suppresses old writes after refreshing the same credential', () => {
    const { store, pending } = setup();
    store.load(credentialFixture.id);
    store.execute(command);
    store.load(credentialFixture.id);
    pending.next(mapCredential({ ...credentialFixture, version: 6 }));
    pending.complete();
    expect(store.credential()?.version).toBe(5);
    expect(store.success()).toBe(false);
  });
});
