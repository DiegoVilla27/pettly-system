import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AccessActionStore } from './access-action.store';
import { AccessActionGateway } from '../services/access-action.gateway';
import { AUTH_SESSION } from '../../../core/auth';
import { ApiProblem } from '../../../core/api';
describe('Single-use email actions', () => {
  function setup() {
    const pending = new Subject<void>(),
      execute = vi.fn(() => pending),
      expire = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        AccessActionStore,
        { provide: AccessActionGateway, useValue: { execute } },
        { provide: AUTH_SESSION, useValue: { identity: signal(null), expire } },
      ],
    });
    return {
      store: TestBed.inject(AccessActionStore),
      pending,
      execute,
      expire,
    };
  }
  const action = {
    action: 'reset' as const,
    email: '',
    password: 'An exact sufficient password!',
    token: 'a'.repeat(43),
  };
  it('never replays a consumed action and keeps anonymous completion visible', () => {
    const { store, pending, execute, expire } = setup();
    store.execute(action);
    store.execute(action);
    pending.next();
    pending.complete();
    store.execute(action);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.success()).toBe(true);
    expect(expire).not.toHaveBeenCalled();
  });
  it('freezes an unknown outcome and does not automatically consume the token again', () => {
    const { store, pending, execute } = setup();
    store.execute(action);
    pending.error(new ApiProblem(0, 'NETWORK', 'Unknown outcome'));
    store.execute(action);
    expect(store.uncertain()).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
