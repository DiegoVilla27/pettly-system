import { ApplicationError } from '../../../shared/domain/application-error';
export const NOTIFICATION_CATEGORIES = [
  'orders',
  'adoptions',
  'organizations',
  'bookings',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export interface BookingDetails {
  serviceName: string;
  organizationName: string;
  startsAt: string;
  endsAt: string;
  totalMinor: number;
}
export interface NotificationState {
  id: string;
  userId: string;
  eventKey: string;
  category: NotificationCategory;
  eventType: string;
  subjectType: string;
  subjectId: string;
  subjectVersion: number;
  status: string;
  title: string;
  body: string;
  details: BookingDetails | null;
  createdAt: Date;
  readAt: Date | null;
}
export interface Preferences {
  userId: string;
  ordersEmail: boolean;
  adoptionsEmail: boolean;
  bookingsEmail: boolean;
  version: number;
  updatedAt: Date;
}
export const titles: Record<NotificationCategory, string> = {
  orders: 'Actualización de tu pedido',
  adoptions: 'Actualización de una solicitud de adopción',
  organizations: 'Actualización de tu organización o acceso',
  bookings: 'Actualización de tu reserva',
};
export function emailEnabled(
  p: Preferences | null,
  category: NotificationCategory,
) {
  if (category === 'organizations') return true;
  return p?.[`${category}Email`] ?? true;
}
export function validateNotice(n: NotificationState) {
  if (
    !NOTIFICATION_CATEGORIES.includes(n.category) ||
    !/^[a-z][a-z0-9_.]{1,59}$/.test(n.eventType) ||
    !n.eventKey.length ||
    n.eventKey.length > 120 ||
    !Number.isInteger(n.subjectVersion) ||
    n.subjectVersion < 1 ||
    !n.status.length ||
    n.status.length > 30 ||
    !n.subjectType.length ||
    n.subjectType.length > 30 ||
    !n.title.length ||
    n.title.length > 150 ||
    !n.body.length ||
    n.body.length > 2000
  )
    throw new ApplicationError('INVALID_INPUT', 'Invalid notification event.');
}
export class Notification {
  private constructor(private readonly state: NotificationState) {}
  static restore(s: NotificationState) {
    return new Notification(structuredClone(s));
  }
  read(now: Date) {
    if (this.state.readAt) return false;
    if (!Number.isFinite(+now) || now < this.state.createdAt)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Read time cannot precede the notification event.',
      );
    this.state.readAt = now;
    return true;
  }
  snapshot() {
    return structuredClone(this.state);
  }
}

export function noticeBody(
  category: NotificationCategory,
  eventType: string,
  status: string,
  id: string,
) {
  const labels: Record<string, string> = {
    awaiting_payment: 'pendiente de pago',
    paid: 'pagado',
    preparing: 'en preparación',
    ready: 'listo para entregar',
    shipped: 'en camino',
    delivered: 'entregado',
    cancelled: 'cancelado',
    expired: 'vencido',
    submitted: 'recibida',
    in_review: 'en revisión',
    approved: 'aprobada',
    rejected: 'rechazada',
    withdrawn: 'retirada',
    completed: 'completada',
    closed: 'cerrada',
    requested: 'pendiente de confirmación',
    confirmed: 'confirmada',
    in_progress: 'en atención',
    no_show: 'registrada como inasistencia',
    active: 'activa',
    suspended: 'suspendida',
    pending: 'en revisión',
    deleted: 'archivada',
  };
  const subjects = {
    orders: 'El pedido',
    adoptions: 'La solicitud de adopción',
    bookings: 'La reserva',
    organizations: 'La organización',
  };
  const message = eventType.startsWith('membership.')
    ? 'Se actualizó una membresía de la organización.'
    : `${subjects[category]} tiene una actualización${labels[status] ? `: ${labels[status]}` : ''}.`;
  return `${message} Referencia: ${id}. Consulta el detalle y estado actual en tu cuenta.`;
}
