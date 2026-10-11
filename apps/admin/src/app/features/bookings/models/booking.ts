import type { ApiRequest, ApiResponse, ApiQuery } from '@pettly/api-client';
export type Booking = ApiResponse<'getManagedBooking'>;
export type BookingQuery = ApiQuery<'listManagedBookings'> & {
  page: number;
  limit: number;
};
export type BookingPage = ApiResponse<'listManagedBookings'>;
export type DecisionBody = ApiRequest<'confirmManagedBooking'>;
export type BookingAudit = Omit<
  ApiResponse<'listManagedBookingAudit'>['items'][number],
  'snapshot'
> & { snapshot: Booking };
export interface BookingContext {
  organizationId: string;
  bookingId: string;
}
export interface Company {
  id: string;
  name: string;
}
export type BookingAction =
  'confirm' | 'reject' | 'cancel' | 'start' | 'complete' | 'no_show';
export interface BookingCommand {
  context: BookingContext;
  action: BookingAction;
  body: DecisionBody;
}
export const statuses = [
  { value: 'requested', label: 'Pendiente de confirmación' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'expired', label: 'Vencida' },
  { value: 'no_show', label: 'Inasistencia' },
] as const;
export const actionLabels: Record<BookingAction, string> = {
  confirm: 'Confirmar solicitud',
  reject: 'Rechazar solicitud',
  cancel: 'Cancelar reserva',
  start: 'Iniciar atención',
  complete: 'Completar atención',
  no_show: 'Marcar inasistencia',
};
export const historyLabels: Record<string, string> = {
  created: 'Creación',
  rescheduled: 'Reprogramación',
  expired: 'Vencimiento',
  ...actionLabels,
};
export function statusLabel(status: Booking['status']) {
  return statuses.find((s) => s.value === status)?.label ?? status;
}
export function availableActions(b: Booking, now: number): BookingAction[] {
  const start = Date.parse(b.startsAt),
    end = Date.parse(b.endsAt);
  if (b.status === 'requested')
    return b.expiresAt && Date.parse(b.expiresAt) > now && start > now
      ? ['confirm', 'reject', 'cancel']
      : [];
  if (b.status === 'confirmed')
    return [
      ...(now < start ? ['cancel' as const] : []),
      ...(now >= start && now < end ? ['start' as const] : []),
      ...(now >= start + 15 * 60000 ? ['no_show' as const] : []),
    ];
  return b.status === 'in_progress' ? ['complete'] : [];
}
