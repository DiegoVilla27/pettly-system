export type {
  BookingState,
  BookingAcceptance,
  BookingSlot,
} from '../../domain/aggregates/booking';
export interface BookingAudit {
  id: string;
  bookingId: string;
  actorId: string | null;
  action: string;
  version: number;
  snapshot: unknown;
  reason: string;
  requestId: string;
  createdAt: Date;
}
