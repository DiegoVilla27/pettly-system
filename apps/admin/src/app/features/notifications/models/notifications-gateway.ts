import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Notice,
  InboxQuery,
  InboxPage,
  Preferences,
  PreferencesCommand,
  Delivery,
  DeliveryPage,
  DeliveryQuery,
} from './notification';
export interface NotificationsGateway {
  inbox(q: InboxQuery): Observable<{ page: InboxPage; count: number }>;
  read(id: string): Observable<Notice>;
  readAll(through: string): Observable<{ updated: number }>;
  preferences(): Observable<Preferences>;
  savePreferences(c: PreferencesCommand): Observable<Preferences>;
  deliveries(q: DeliveryQuery): Observable<DeliveryPage>;
  retry(id: string, reason: string): Observable<Delivery>;
}
export const NOTIFICATIONS_GATEWAY = new InjectionToken<NotificationsGateway>(
  'NOTIFICATIONS_GATEWAY',
);
