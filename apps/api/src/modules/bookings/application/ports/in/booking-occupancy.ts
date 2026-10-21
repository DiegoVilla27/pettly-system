import type { TimeRange } from '../../../../../shared/domain/scheduling';
export interface BookingOccupancy {
  range(
    resourceId: string,
    from: Date,
    to: Date,
    now: Date,
  ): Promise<(TimeRange & { id: string })[]>;
}
export const BOOKING_OCCUPANCY = Symbol('BOOKING_OCCUPANCY');
