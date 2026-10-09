export interface BookingNotice {
  bookingId: string;
  version: number;
  userId: string;
  to: string;
  serviceName: string;
  organizationName: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  totalMinor: number;
  now: Date;
}
export interface BookingNotifications {
  replace(notice: BookingNotice): Promise<void>;
  cancel(bookingId: string): Promise<void>;
}
export const BOOKING_NOTIFICATIONS = Symbol('BOOKING_NOTIFICATIONS');
