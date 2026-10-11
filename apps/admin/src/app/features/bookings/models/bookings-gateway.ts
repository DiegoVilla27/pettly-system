import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Company,
  Booking,
  BookingQuery,
  BookingPage,
  BookingContext,
  BookingCommand,
  BookingAudit,
} from './booking';
export interface BookingsGateway {
  companies(search: string, currentId?: string): Observable<Company[]>;
  list(query: BookingQuery): Observable<BookingPage>;
  get(context: BookingContext): Observable<Booking>;
  audit(
    context: BookingContext,
    page: number,
  ): Observable<{ items: BookingAudit[]; total: number }>;
  execute(command: BookingCommand): Observable<Booking>;
}
export const BOOKINGS_GATEWAY = new InjectionToken<BookingsGateway>(
  'BOOKINGS_GATEWAY',
);
