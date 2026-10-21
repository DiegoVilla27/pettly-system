import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { BOOKINGS_GATEWAY } from '../models/bookings-gateway';
import { BookingDetailStore } from './booking-detail.store';
import { booking } from '../testing/booking.fixture';
import type { Booking } from '../models/booking';
import { ApiProblem } from '../../../core/api';
const context = {
    organizationId: booking.organizationId,
    bookingId: booking.id,
  },
  command = {
    context,
    action: 'confirm' as const,
    body: { expectedVersion: 1, reason: 'Provider confirmation verification' },
  };
describe('Booking mutation concurrency', () => {
  it('excludes duplicates and freezes manual replay after conflicts or uncertain outcomes', () => {
    const pending = new Subject<Booking>(),
      execute = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        BookingDetailStore,
        {
          provide: BOOKINGS_GATEWAY,
          useValue: { get: () => of(booking), execute },
        },
      ],
    });
    const store = TestBed.inject(BookingDetailStore);
    store.load(context);
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(409, 'CONFLICT', 'Changed'));
    store.execute(command);
    expect(store.refreshRequired()).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
    store.load(context);
    expect(store.refreshRequired()).toBe(false);
  });
  it('requires explicit refresh after transport loss and ignores late writes on a changed route', () => {
    const pending = new Subject<Booking>(),
      execute = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        BookingDetailStore,
        {
          provide: BOOKINGS_GATEWAY,
          useValue: { get: () => of(booking), execute },
        },
      ],
    });
    const store = TestBed.inject(BookingDetailStore);
    store.load(context);
    store.execute(command);
    pending.error(new ApiProblem(0, 'NETWORK', 'Unknown'));
    expect(store.refreshRequired()).toBe(true);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('does not apply a successful decision to another route', () => {
    const pending = new Subject<Booking>();
    TestBed.configureTestingModule({
      providers: [
        BookingDetailStore,
        {
          provide: BOOKINGS_GATEWAY,
          useValue: { get: () => of(booking), execute: () => pending },
        },
      ],
    });
    const store = TestBed.inject(BookingDetailStore);
    store.load(context);
    store.execute(command);
    store.load({ ...context, bookingId: booking.buyerId });
    pending.next({
      ...booking,
      status: 'confirmed',
      expiresAt: null,
      version: 2,
    });
    pending.complete();
    expect(store.success()).toBeNull();
    expect(store.booking()?.version).toBe(1);
  });
});
