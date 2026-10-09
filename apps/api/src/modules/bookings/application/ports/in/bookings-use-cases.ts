import type {
  CreateBookingCommand,
  BookingActionCommand,
  RescheduleBookingCommand,
} from '../../commands/booking.commands';
import type { BookingsQuery } from '../../queries/booking.queries';
import type { BookingsWork } from '../out/bookings-repository';
import type { BookingState } from '../../results/booking';
export interface BookingsUseCases {
  create(c: CreateBookingCommand): Promise<BookingState>;
  action(c: BookingActionCommand): Promise<BookingState>;
  reschedule(c: RescheduleBookingCommand): Promise<BookingState>;
  get(actorId: string, id: string, provider?: boolean): Promise<BookingState>;
  list(q: BookingsQuery): ReturnType<BookingsWork['list']>;
  history(
    actor: string,
    id: string,
    page: number,
    limit: number,
    provider?: boolean,
  ): ReturnType<BookingsWork['audits']>;
  expireDue(): Promise<number>;
}
export const BOOKINGS_USE_CASES = Symbol('BOOKINGS_USE_CASES');
