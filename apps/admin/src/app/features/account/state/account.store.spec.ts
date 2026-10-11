import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { AccountStore } from './account.store';
import { ACCOUNT_GATEWAY } from '../models/account-gateway';
import { AUTH_SESSION } from '../../../core/auth';
import { ApiProblem } from '../../../core/api';
describe('Own account mutation privacy and reconciliation', () => {
  function setup() {
    const pending = new Subject<void>();
    const execute = vi.fn(() => pending);
    const profile = vi.fn(() => of({ id: 'account' }));
    const expire = vi.fn(),
      restore = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        AccountStore,
        {
          provide: ACCOUNT_GATEWAY,
          useValue: {
            profile,
            sessions: () => of({ items: [], total: 0, page: 1, limit: 20 }),
            execute,
          },
        },
        {
          provide: AUTH_SESSION,
          useValue: { identity: signal({ id: 'account' }), expire, restore },
        },
      ],
    });
    return {
      store: TestBed.inject(AccountStore),
      pending,
      execute,
      profile,
      expire,
      restore,
    };
  }
  it('catches profile read errors and allows explicit retry', () => {
    const { store, profile } = setup();
    profile.mockReturnValueOnce(
      throwError(() => new ApiProblem(503, 'UNAVAILABLE', 'Private failure')),
    );
    store.load(1);
    expect(store.loading()).toBe(false);
    expect(store.profile()).toBeNull();
    expect(store.problem()?.status).toBe(503);
    store.load(1);
    expect(store.profile()?.id).toBe('account');
  });
  it('prevents duplicate writes and replay after response loss', () => {
    const { store, pending, execute } = setup();
    store.load(1);
    store.execute({ kind: 'logout-all' });
    store.execute({ kind: 'logout-all' });
    expect(execute).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(0, 'NETWORK', 'Unknown outcome'));
    expect(store.refreshRequired()).toBe(true);
    store.execute({ kind: 'logout-all' });
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('does not sign out or restore a late mutation after explicit reload', () => {
    const { store, pending, expire } = setup();
    store.load(1);
    store.execute({ kind: 'logout-all' });
    store.load(1);
    pending.next();
    pending.complete();
    expect(expire).not.toHaveBeenCalled();
    expect(store.profile()?.id).toBe('account');
  });
  it('clears personal state after confirmed global logout', () => {
    const { store, pending, expire } = setup();
    store.load(1);
    store.execute({ kind: 'logout-all' });
    pending.next();
    pending.complete();
    expect(expire).toHaveBeenCalledTimes(1);
    expect(store.profile()).toBeNull();
    expect(store.sessions()).toBeNull();
  });
});
