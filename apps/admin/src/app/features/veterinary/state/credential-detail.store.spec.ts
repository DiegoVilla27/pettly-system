import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { VETERINARY_GATEWAY } from '../models/veterinary-gateway';
import { CredentialDetailStore } from './credential-detail.store';
import { credentialFixture } from '../testing/credential.fixture';
import { mapCredential } from '../mappers/veterinary.mapper';
import type { Credential } from '../models/credential';
import { ApiProblem } from '../../../core/api';
describe('Veterinary decision and private image state', () => {
  it('excludes duplicate mutations and requires explicit refresh after a conflict', () => {
    const pending = new Subject<Credential>();
    const get = vi.fn(() => of(mapCredential(credentialFixture)));
    const execute = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        CredentialDetailStore,
        { provide: VETERINARY_GATEWAY, useValue: { get, execute } },
      ],
    });
    const store = TestBed.inject(CredentialDetailStore);
    store.load(credentialFixture.id);
    const command = {
      kind: 'revoke' as const,
      credentialId: credentialFixture.id,
      body: {
        reason: 'Private test administrative reason',
        expectedVersion: 5,
      },
    };
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(409, 'CONFLICT', 'Private internal details'));
    expect(store.problem()?.message).toContain('Actualiza los datos');
    expect(store.credential()?.version).toBe(5);
    expect(get).toHaveBeenCalledTimes(1);
    expect(store.busy()).toBe(false);
    store.load(credentialFixture.id);
    expect(get).toHaveBeenCalledTimes(2);
  });
  it('does not restore closed evidence or leak a late decision to another credential', () => {
    const pending = new Subject<Blob>(),
      mutation = new Subject<Credential>();
    TestBed.configureTestingModule({
      providers: [
        CredentialDetailStore,
        {
          provide: VETERINARY_GATEWAY,
          useValue: {
            get: (id: string) =>
              of(mapCredential({ ...credentialFixture, id })),
            evidence: () => pending,
            execute: () => mutation,
          },
        },
      ],
    });
    const store = TestBed.inject(CredentialDetailStore);
    store.load(credentialFixture.id);
    store.openEvidence(
      credentialFixture.documents[0]?.mediaId ?? credentialFixture.id,
    );
    store.closeEvidence();
    pending.next(new Blob(['private'], { type: 'image/jpeg' }));
    expect(store.evidence()).toBeNull();
    store.execute({
      kind: 'revoke',
      credentialId: credentialFixture.id,
      body: {
        reason: 'Private test administrative reason',
        expectedVersion: 5,
      },
    });
    store.load(credentialFixture.organizationId);
    mutation.next(
      mapCredential({ ...credentialFixture, status: 'revoked', version: 6 }),
    );
    mutation.complete();
    expect(store.credential()?.id).toBe(credentialFixture.organizationId);
    expect(store.success()).toBe('');
  });
});
