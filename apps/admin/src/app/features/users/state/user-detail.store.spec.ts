import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of } from 'rxjs';
import { AUTH_SESSION } from '../../../core/auth';
import { ApiProblem } from '../../../core/api';
import { USERS_GATEWAY } from '../models/users-gateway';
import { UserDetailStore } from './user-detail.store';
const id = '9d9dc708-d471-44d8-ab8a-463c04721baf';
describe('Administrative account mutations', () => {
  it('ignores duplicate submissions and requires reconciliation after conflicts', () => {
    const first = new Subject<void>(),
      second = new Subject<void>();
    const execute = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const expire = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        UserDetailStore,
        {
          provide: USERS_GATEWAY,
          useValue: {
            execute,
            get: () => of({ id, globalRole: 'super_admin' }),
            access: () => of({ userId: id, globalRole: 'super_admin' }),
          },
        },
        {
          provide: AUTH_SESSION,
          useValue: { identity: signal({ id }), expire },
        },
      ],
    });
    const store = TestBed.inject(UserDetailStore);
    store.load(id);
    const command = {
      kind: 'status' as const,
      userId: id,
      body: {
        status: 'disabled' as const,
        reason: 'Administrative verification',
      },
    };
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.busy()).toBe(true);
    first.error(
      new ApiProblem(409, 'LAST_SUPER_ADMIN', 'Private server detail'),
    );
    expect(store.problem()?.message).toContain('El cambio fue bloqueado');
    expect(store.problem()?.message).not.toContain('Private server detail');
    expect(expire).not.toHaveBeenCalled();
    expect(store.busy()).toBe(false);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    store.load(id);
    store.execute(command);
    second.next();
    second.complete();
    expect(expire).toHaveBeenCalledTimes(1);
    expect(store.busy()).toBe(false);
  });
  it('fails closed when separately loaded profile and access disagree', () => {
    TestBed.configureTestingModule({
      providers: [
        UserDetailStore,
        {
          provide: USERS_GATEWAY,
          useValue: {
            get: () => of({ id, globalRole: 'user' }),
            access: () => of({ userId: id, globalRole: 'moderator' }),
          },
        },
        { provide: AUTH_SESSION, useValue: { identity: signal(null) } },
      ],
    });
    const store = TestBed.inject(UserDetailStore);
    store.load(id);
    expect(store.user()).toBeNull();
    expect(store.access()).toBeNull();
    expect(store.problem()?.code).toBe('STALE_ACCESS');
  });
  it('does not replace a new account view with an old mutation response', () => {
    const pending = new Subject<void>();
    const get = vi.fn((userId: string) =>
      of({ id: userId, globalRole: 'user' }),
    );
    TestBed.configureTestingModule({
      providers: [
        UserDetailStore,
        {
          provide: USERS_GATEWAY,
          useValue: {
            get,
            access: (userId: string) => of({ userId, globalRole: 'user' }),
            execute: () => pending,
          },
        },
        { provide: AUTH_SESSION, useValue: { identity: signal(null) } },
      ],
    });
    const store = TestBed.inject(UserDetailStore);
    const nextId = '6ee2a5af-85e0-4109-b778-1d2eb73aad1c';
    store.load(id);
    store.execute({
      kind: 'profile',
      userId: id,
      body: {
        profile: { city: 'Medellín' },
        reason: 'Administrative verification',
      },
    });
    store.load(nextId);
    pending.next();
    pending.complete();
    expect(store.user()?.id).toBe(nextId);
    expect(get).toHaveBeenCalledTimes(2);
    expect(store.success()).toBe('');
  });
});
