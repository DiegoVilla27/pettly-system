import { Prisma, type InboxNotification } from '@prisma/client';
import type { NotificationState } from '../../../application/results/notification';
export class NotificationsPersistenceMapper {
  static json(s: unknown) {
    return s === null
      ? Prisma.JsonNull
      : (JSON.parse(JSON.stringify(s)) as Prisma.InputJsonValue);
  }
  static notification(r: InboxNotification): NotificationState {
    return {
      ...r,
      category: r.category as NotificationState['category'],
      details: r.details as unknown as NotificationState['details'],
    };
  }
}
