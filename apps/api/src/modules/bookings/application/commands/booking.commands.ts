import type { BookingSlot } from '../results/booking';
export interface BookingSelection {
  resourceId: string;
  expectedServiceVersion: number;
  expectedResourceVersion: number;
  expectedTotalMinor: number;
  slot: BookingSlot;
  contact: { name: string; phone: string };
  consent: true;
}
export class CreateBookingCommand {
  constructor(
    readonly actorId: string,
    readonly serviceId: string,
    readonly animalId: string,
    readonly idempotencyKey: string,
    readonly selection: BookingSelection,
    readonly requestId: string,
  ) {}
}
export class BookingActionCommand {
  constructor(
    readonly actorId: string,
    readonly id: string,
    readonly expectedVersion: number,
    readonly action:
      'confirm' | 'reject' | 'cancel' | 'start' | 'complete' | 'no_show',
    readonly reason: string,
    readonly requestId: string,
    readonly provider = false,
  ) {}
}
export class RescheduleBookingCommand {
  constructor(
    readonly actorId: string,
    readonly id: string,
    readonly expectedVersion: number,
    readonly selection: BookingSelection,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
