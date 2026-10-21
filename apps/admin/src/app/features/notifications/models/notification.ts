import type { ApiResponse, ApiRequest, ApiQuery } from '@pettly/api-client';
export type Notice = ApiResponse<'readOwnNotification'>;
export type InboxQuery = ApiQuery<'listOwnNotifications'> & {
  page: number;
  limit: number;
  unreadOnly: 'true' | 'false';
};
export type InboxPage = ApiResponse<'listOwnNotifications'>;
export type Preferences = ApiResponse<'getOwnNotificationPreferences'>;
export type PreferencesCommand = ApiRequest<'changeOwnNotificationPreferences'>;
export type Delivery = ApiResponse<'retryFailedNotificationDelivery'>;
export type DeliveryPage = ApiResponse<'listFailedNotificationDeliveries'>;
export type DeliveryQuery = { page: number; limit: number };
export const categories = [
  { value: 'orders', label: 'Pedidos' },
  { value: 'adoptions', label: 'Adopciones' },
  { value: 'organizations', label: 'Organizaciones y acceso' },
  { value: 'bookings', label: 'Reservas' },
] as const;
export function categoryLabel(value: Notice['category']) {
  return categories.find((c) => c.value === value)?.label ?? value;
}
export function failureLabel(value: string | null) {
  return (
    (
      {
        delivery_failed: 'Intentos agotados',
        expired: 'Plazo vencido',
        superseded: 'Sustituida por otra revisión',
        preferences_disabled: 'Correo desactivado por preferencia',
      } as Record<string, string>
    )[value ?? ''] ?? 'No recuperable por esta vía'
  );
}
export function retryCandidate(d: Delivery, now: number) {
  return (
    !!d.notificationId &&
    !!d.failedAt &&
    !d.deliveredAt &&
    d.failureKind === 'delivery_failed' &&
    Date.parse(d.expiresAt) > now
  );
}
