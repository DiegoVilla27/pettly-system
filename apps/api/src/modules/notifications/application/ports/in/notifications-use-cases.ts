import type {
  NotificationState,
  Preferences,
  Delivery,
} from '../../results/notification';
import type {
  ReadNotificationCommand,
  ReadAllNotificationsCommand,
  ChangeNotificationPreferencesCommand,
  RetryNotificationCommand,
} from '../../commands/notification.commands';
import type {
  NotificationsQuery,
  FailedDeliveriesQuery,
} from '../../queries/notification.queries';
export interface NotificationsUseCases {
  list(
    q: NotificationsQuery,
  ): Promise<{ items: NotificationState[]; total: number }>;
  unread(actorId: string): Promise<number>;
  read(c: ReadNotificationCommand): Promise<NotificationState>;
  readAll(c: ReadAllNotificationsCommand): Promise<number>;
  preferences(actorId: string): Promise<Preferences>;
  changePreferences(
    c: ChangeNotificationPreferencesCommand,
  ): Promise<Preferences>;
  failed(
    q: FailedDeliveriesQuery,
  ): Promise<{ items: Delivery[]; total: number }>;
  retry(c: RetryNotificationCommand): Promise<Delivery>;
}
export const NOTIFICATIONS_USE_CASES = Symbol('NOTIFICATIONS_USE_CASES');
