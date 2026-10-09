import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  civilDate,
  fitsCalendar,
  localInstant,
} from '../../../../shared/domain/scheduling';
import type {
  TimeRange,
  ResourceCalendar,
} from '../../../../shared/domain/scheduling';
export const BOOKING_STATUSES = [
  'requested',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'rejected',
  'expired',
  'no_show',
] as const;
export type BookingSlot =
  | { kind: 'appointment'; startsAt: string }
  | { kind: 'lodging'; startDate: string; endDate: string };
export interface BookingPolicy {
  category?: string;
  veterinaryCredentialId?: string | null;
  name: string;
  kind: 'appointment' | 'lodging';
  priceMinor: number;
  currency: 'COP';
  collectionMode: 'pay_at_business';
  confirmationMode: 'automatic' | 'manual';
  durationMinutes: number | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  checkInMinute: number | null;
  checkOutMinute: number | null;
  minNights: number;
  maxNights: number;
  minimumNoticeMinutes: number;
  cancellationCutoffMinutes: number;
  requestTtlMinutes: number;
  requirements: string;
  terms: string;
  version: number;
}
export interface BookingAcceptance {
  service: BookingPolicy;
  resource: { id: string; name: string; version: number };
  organizationName: string;
  pet: { id: string; name: string; species: string };
  contact: { name: string; phone: string };
  consent: true;
  acceptedAt: Date;
  timeZone: 'America/Bogota';
  totalMinor: number;
  nights: number | null;
  slot: BookingSlot;
}
export interface BookingState {
  id: string;
  buyerId: string;
  animalId: string;
  serviceId: string;
  resourceId: string;
  organizationId: string;
  idempotencyKey: string;
  fingerprint: string;
  status: (typeof BOOKING_STATUSES)[number];
  version: number;
  startsAt: Date;
  endsAt: Date;
  occupiedStartsAt: Date;
  occupiedEndsAt: Date;
  expiresAt: Date | null;
  acceptance: BookingAcceptance;
  createdAt: Date;
  updatedAt: Date;
}
export function bookingInterval(
  s: BookingPolicy,
  slot: BookingSlot,
  calendar: ResourceCalendar,
  now: Date,
) {
  if (slot.kind !== s.kind)
    throw new ApplicationError(
      'INVALID_INPUT',
      'Slot kind must match service.',
    );
  let startsAt: Date,
    endsAt: Date,
    nights: number | null = null;
  if (slot.kind === 'appointment') {
    startsAt = new Date(slot.startsAt);
    if (
      !Number.isFinite(+startsAt) ||
      startsAt.getUTCSeconds() ||
      startsAt.getUTCMilliseconds() ||
      startsAt.getUTCMinutes() % 15
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Appointments start on exact UTC quarter-hours.',
      );
    endsAt = new Date(+startsAt + s.durationMinutes! * 60000);
  } else {
    civilDate(slot.startDate);
    civilDate(slot.endDate);
    nights = (Date.parse(slot.endDate) - Date.parse(slot.startDate)) / 86400000;
    if (
      !Number.isInteger(nights) ||
      nights < s.minNights ||
      nights > s.maxNights
    )
      throw new ApplicationError('INVALID_INPUT', 'Invalid stay length.');
    startsAt = localInstant(slot.startDate, s.checkInMinute!);
    endsAt = localInstant(slot.endDate, s.checkOutMinute!);
  }
  if (
    +startsAt < +now + s.minimumNoticeMinutes * 60000 ||
    +startsAt > +now + 180 * 86400000
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'Booking is outside notice or 180-day horizon.',
    );
  const occupied: TimeRange = {
    startsAt: new Date(+startsAt - s.bufferBeforeMinutes * 60000),
    endsAt: new Date(+endsAt + s.bufferAfterMinutes * 60000),
  };
  if (!fitsCalendar(calendar, occupied))
    throw new ApplicationError(
      'CONFLICT',
      'Requested interval is outside the resource calendar.',
    );
  return {
    startsAt,
    endsAt,
    occupiedStartsAt: occupied.startsAt,
    occupiedEndsAt: occupied.endsAt,
    nights,
    totalMinor: s.priceMinor * (nights ?? 1),
  };
}
export class Booking {
  private constructor(private state: BookingState) {}
  static restore(s: BookingState) {
    return new Booking(structuredClone(s));
  }
  static create(s: BookingState) {
    return new Booking(structuredClone(s));
  }
  snapshot() {
    return structuredClone(this.state);
  }
  expect(v: number) {
    if (v !== this.state.version)
      throw new ApplicationError('CONFLICT', 'Booking version changed.');
  }
  expire(now: Date) {
    if (
      this.state.status === 'requested' &&
      this.state.expiresAt &&
      this.state.expiresAt <= now
    ) {
      this.state.status = 'expired';
      this.state.expiresAt = null;
      this.touch(now);
      return true;
    }
    return false;
  }
  cancellable(now: Date) {
    if (
      !['requested', 'confirmed'].includes(this.state.status) ||
      +now >=
        +this.state.startsAt -
          this.state.acceptance.service.cancellationCutoffMinutes * 60000
    )
      throw new ApplicationError(
        'CONFLICT',
        'Booking is outside its accepted cancellation or rescheduling window.',
      );
  }
  transition(
    action: 'confirm' | 'reject' | 'cancel' | 'start' | 'complete' | 'no_show',
    provider: boolean,
    now: Date,
  ) {
    const s = this.state;
    if (action === 'confirm' || action === 'reject') {
      if (
        !provider ||
        s.status !== 'requested' ||
        !s.expiresAt ||
        s.expiresAt <= now
      )
        throw new ApplicationError(
          'CONFLICT',
          'Only an unexpired pending request can be decided.',
        );
      s.status = action === 'confirm' ? 'confirmed' : 'rejected';
    } else if (action === 'cancel') {
      if (provider) {
        if (!['requested', 'confirmed'].includes(s.status) || now >= s.startsAt)
          throw new ApplicationError(
            'CONFLICT',
            'Only future bookings can be cancelled.',
          );
      } else this.cancellable(now);
      s.status = 'cancelled';
    } else if (action === 'start') {
      if (
        !provider ||
        s.status !== 'confirmed' ||
        now < s.startsAt ||
        now >= s.endsAt
      )
        throw new ApplicationError(
          'CONFLICT',
          'Only a confirmed booking in its service window can start.',
        );
      s.status = 'in_progress';
    } else if (action === 'complete') {
      if (!provider || s.status !== 'in_progress')
        throw new ApplicationError(
          'CONFLICT',
          'Only an attended booking can complete.',
        );
      s.status = 'completed';
    } else {
      if (
        !provider ||
        s.status !== 'confirmed' ||
        +now < +s.startsAt + 15 * 60000
      )
        throw new ApplicationError(
          'CONFLICT',
          'No-show requires a confirmed booking and fifteen-minute grace.',
        );
      s.status = 'no_show';
    }
    s.expiresAt = null;
    this.touch(now);
  }
  reschedule(
    next: Pick<
      BookingState,
      | 'resourceId'
      | 'startsAt'
      | 'endsAt'
      | 'occupiedStartsAt'
      | 'occupiedEndsAt'
      | 'acceptance'
      | 'expiresAt'
      | 'status'
    >,
    now: Date,
  ) {
    this.cancellable(now);
    Object.assign(this.state, next);
    this.touch(now);
  }
  private touch(now: Date) {
    this.state.version++;
    this.state.updatedAt = now;
  }
}
