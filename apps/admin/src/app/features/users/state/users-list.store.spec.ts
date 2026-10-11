import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { USERS_GATEWAY } from '../models/users-gateway';
import { UsersListStore } from './users-list.store';
import { defaultFilters, type Page, type User } from '../models/user';
describe('User search state', () => {
  it('cancels obsolete queries and accepts subsequent searches after failure', () => {
    const first = new Subject<Page<User>>(),
      second = new Subject<Page<User>>(),
      third = new Subject<Page<User>>();
    const list = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(third);
    TestBed.configureTestingModule({
      providers: [
        UsersListStore,
        { provide: USERS_GATEWAY, useValue: { list } },
      ],
    });
    const store = TestBed.inject(UsersListStore);
    store.load({ ...defaultFilters, search: 'old' });
    store.load({ ...defaultFilters, search: 'new' });
    first.next({ items: [], total: 99, page: 1, limit: 20 });
    expect(store.total()).toBe(0);
    second.error(new Error('Connection failed'));
    expect(store.problem()).not.toBeNull();
    expect(store.loading()).toBe(false);
    store.load(defaultFilters);
    third.next({ items: [], total: 3, page: 1, limit: 20 });
    expect(store.total()).toBe(3);
    expect(store.problem()).toBeNull();
  });
});
