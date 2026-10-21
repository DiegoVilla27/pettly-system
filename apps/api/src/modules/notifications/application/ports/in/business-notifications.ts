import type {
  NotificationCategory,
  BookingDetails,
} from '../../../domain/notification';
export interface BusinessNotice {
  eventKey: string;
  category: NotificationCategory;
  eventType: string;
  subjectId: string;
  subjectType: string;
  subjectVersion: number;
  status: string;
  recipientIds: string[];
  booking?: BookingDetails;
  now: Date;
}
export interface BusinessNotifications {
  publish(notice: BusinessNotice): Promise<void>;
}
export const BUSINESS_NOTIFICATIONS = Symbol('BUSINESS_NOTIFICATIONS');
