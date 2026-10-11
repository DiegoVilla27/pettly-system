import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { NOTIFICATIONS_GATEWAY } from '../models/notifications-gateway';
import { PreferencesStore } from './preferences.store';
import { InboxStore } from './inbox.store';
import { DeliveriesStore } from './deliveries.store';
import { preferences, notice, delivery } from '../testing/notification.fixture';
import type { Preferences, Notice, Delivery } from '../models/notification';
import { ApiProblem } from '../../../core/api';
describe('Personal notification mutation safety', () => {
  it('ignores late retry receipts after a different page was selected', () => {
    const pending = new Subject<Delivery>();
    TestBed.configureTestingModule({
      providers: [
        DeliveriesStore,
        {
          provide: NOTIFICATIONS_GATEWAY,
          useValue: {
            deliveries: () =>
              of({ items: [delivery], total: 1, page: 1, limit: 20 }),
            retry: () => pending,
          },
        },
      ],
    });
    const store = TestBed.inject(DeliveriesStore);
    store.load({ page: 1, limit: 20 });
    store.retry({ id: delivery.id, reason: 'Resolved mail transport outage' });
    store.load({ page: 2, limit: 20 });
    pending.next({
      ...delivery,
      id: crypto.randomUUID(),
      retryOfId: delivery.id,
    });
    pending.complete();
    expect(store.receipt()).toBeNull();
  });
  it('excludes duplicate preference writes and freezes stale versions until explicit refresh', () => {
    const pending = new Subject<Preferences>(),
      savePreferences = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        PreferencesStore,
        {
          provide: NOTIFICATIONS_GATEWAY,
          useValue: { preferences: () => of(preferences), savePreferences },
        },
      ],
    });
    const s = TestBed.inject(PreferencesStore);
    s.load();
    const c = {
      expectedVersion: 0,
      ordersEmail: false,
      adoptionsEmail: true,
      bookingsEmail: true,
    };
    s.save(c);
    s.save(c);
    expect(savePreferences).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(409, 'CONFLICT', 'Changed'));
    s.save(c);
    expect(s.refreshRequired()).toBe(true);
    expect(savePreferences).toHaveBeenCalledTimes(1);
    s.load();
    expect(s.refreshRequired()).toBe(false);
  });
  it('does not replay a read after transport uncertainty and clears private items after denial', () => {
    const pending = new Subject<Notice>(),
      read = vi.fn<() => import('rxjs').Observable<Notice>>(() => pending);
    TestBed.configureTestingModule({
      providers: [
        InboxStore,
        {
          provide: NOTIFICATIONS_GATEWAY,
          useValue: {
            inbox: () =>
              of({
                page: { items: [notice], total: 1, page: 1, limit: 20 },
                count: 1,
              }),
            read,
          },
        },
      ],
    });
    const s = TestBed.inject(InboxStore);
    s.load({ page: 1, limit: 20, unreadOnly: 'false' });
    s.write({ id: notice.id });
    pending.error(new ApiProblem(0, 'NETWORK', 'Lost'));
    s.write({ id: notice.id });
    expect(read).toHaveBeenCalledTimes(1);
    expect(s.refreshRequired()).toBe(true);
    expect(s.entities()).toHaveLength(1);
    s.load({ page: 1, limit: 20, unreadOnly: 'false' });
    read.mockReturnValue(
      throwError(() => new ApiProblem(403, 'FORBIDDEN', 'Denied')),
    );
    s.write({ id: notice.id });
    expect(s.entities()).toHaveLength(0);
  });
  it('prevents duplicate recovery and keeps the queued receipt distinct from delivered mail', () => {
    const pending = new Subject<Delivery>(),
      retry = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        DeliveriesStore,
        {
          provide: NOTIFICATIONS_GATEWAY,
          useValue: {
            deliveries: () =>
              of({ items: [delivery], total: 1, page: 1, limit: 20 }),
            retry,
          },
        },
      ],
    });
    const s = TestBed.inject(DeliveriesStore);
    s.load({ page: 1, limit: 20 });
    const c = { id: delivery.id, reason: 'Resolved mail transport outage' };
    s.retry(c);
    s.retry(c);
    expect(retry).toHaveBeenCalledTimes(1);
    pending.next({
      ...delivery,
      id: crypto.randomUUID(),
      retryOfId: delivery.id,
      failedAt: null,
      deliveredAt: null,
    });
    pending.complete();
    s.retry(c);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(s.receipt()?.deliveredAt).toBeNull();
  });
});
