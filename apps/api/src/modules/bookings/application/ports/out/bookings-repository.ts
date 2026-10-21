import type { BookingState, BookingAudit } from '../../results/booking';
import type { BookingsQuery } from '../../queries/booking.queries';
export interface BookingsWork {
  lock(key: string): Promise<void>;
  find(id: string): Promise<BookingState | null>;
  replay(buyerId: string, key: string): Promise<BookingState | null>;
  save(s: BookingState): Promise<void>;
  petOverlap(
    animalId: string,
    from: Date,
    to: Date,
    now: Date,
    exclude?: string,
  ): Promise<boolean>;
  audit(a: BookingAudit): Promise<void>;
  audits(
    id: string,
    page: number,
    limit: number,
  ): Promise<{ items: BookingAudit[]; total: number }>;
  list(q: BookingsQuery): Promise<{ items: BookingState[]; total: number }>;
  due(now: Date, limit: number): Promise<BookingState[]>;
}
export interface BookingsRepository {
  run<T>(work: (tx: BookingsWork) => Promise<T>): Promise<T>;
}
export const BOOKINGS_REPOSITORY = Symbol('BOOKINGS_REPOSITORY');
