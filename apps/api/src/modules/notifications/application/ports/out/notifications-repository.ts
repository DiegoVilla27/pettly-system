import type {
  NotificationState,
  Preferences,
  Delivery,
} from '../../results/notification';
import type { NotificationsQuery } from '../../queries/notification.queries';
export interface EmailJob {
  id: string;
  notification: NotificationState;
  to: string;
  purpose: 'business_notice' | 'booking_update' | 'booking_reminder';
  notBefore: Date;
  expiresAt: Date;
  deduplicationKey: string;
  retryOfId: string | null;
}
export interface NotificationsWork {
  lock(key: string): Promise<void>;
  find(id: string): Promise<NotificationState | null>;
  event(userId: string, key: string): Promise<NotificationState | null>;
  create(n: NotificationState): Promise<void>;
  read(id: string, at: Date): Promise<void>;
  readAll(userId: string, through: Date, at: Date): Promise<number>;
  list(
    q: NotificationsQuery,
  ): Promise<{ items: NotificationState[]; total: number }>;
  unread(userId: string): Promise<number>;
  preferences(userId: string): Promise<Preferences | null>;
  savePreferences(p: Preferences): Promise<void>;
  cancelOptional(
    userId: string,
    categories: string[],
    now: Date,
  ): Promise<void>;
  enqueue(j: EmailJob): Promise<void>;
  delivery(id: string): Promise<Delivery | null>;
  child(id: string): Promise<Delivery | null>;
  failed(
    page: number,
    limit: number,
  ): Promise<{ items: Delivery[]; total: number }>;
  retryAudit(a: {
    id: string;
    failedOutboxId: string;
    newOutboxId: string;
    actorId: string;
    reason: string;
    createdAt: Date;
  }): Promise<void>;
}
export interface NotificationsRepository {
  run<T>(work: (tx: NotificationsWork) => Promise<T>): Promise<T>;
}
export const NOTIFICATIONS_REPOSITORY = Symbol('NOTIFICATIONS_REPOSITORY');
