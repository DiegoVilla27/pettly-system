export type { NotificationState, Preferences } from '../../domain/notification';
export interface Delivery {
  id: string;
  notificationId: string | null;
  subjectType: string | null;
  subjectId: string | null;
  subjectVersion: number | null;
  mailPurpose: string | null;
  failureKind: string | null;
  expiresAt: Date;
  notBefore: Date;
  failedAt: Date | null;
  deliveredAt: Date | null;
  attempts: number;
  createdAt: Date;
  retryOfId: string | null;
}
