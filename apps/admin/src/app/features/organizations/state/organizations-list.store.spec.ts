import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ORGANIZATIONS_GATEWAY } from '../models/organizations-gateway';
import { OrganizationsListStore } from './organizations-list.store';
import type { Organization, Page } from '../models/organization';
describe('Organization search', () => {
  it('cancels old filters and recovers after a failed search', () => {
    const first = new Subject<Page<Organization>>(),
      second = new Subject<Page<Organization>>(),
      third = new Subject<Page<Organization>>();
    const list = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(third);
    TestBed.configureTestingModule({
      providers: [
        OrganizationsListStore,
        { provide: ORGANIZATIONS_GATEWAY, useValue: { list } },
      ],
    });
    const store = TestBed.inject(OrganizationsListStore);
    store.load({ page: 1, limit: 20, status: 'draft' });
    store.load({ page: 1, limit: 20, status: 'pending' });
    first.next({ items: [], page: 1, limit: 20, total: 99 });
    expect(store.total()).toBe(0);
    second.error(new Error('Disconnected'));
    expect(store.loading()).toBe(false);
    expect(store.problem()).not.toBeNull();
    store.load({ page: 1, limit: 20 });
    third.next({ items: [], page: 1, limit: 20, total: 0 });
    expect(store.problem()).toBeNull();
  });
});
