import type {
  NotificationState,
  Preferences,
  Delivery,
} from '../../../../application/results/notification';
export class NotificationsHttpMapper {
  static notification(n: NotificationState) {
    const {
      id,
      category,
      eventType,
      subjectType,
      subjectId,
      subjectVersion,
      status,
      title,
      body,
      createdAt,
      readAt,
    } = n;
    return {
      id,
      category,
      eventType,
      subjectType,
      subjectId,
      subjectVersion,
      status,
      title,
      body,
      createdAt: createdAt.toISOString(),
      readAt: readAt?.toISOString() ?? null,
    };
  }
  static preferences(p: Preferences) {
    return {
      ordersEmail: p.ordersEmail,
      adoptionsEmail: p.adoptionsEmail,
      bookingsEmail: p.bookingsEmail,
      organizationEmailMandatory: true as const,
      inAppMandatory: true as const,
      version: p.version,
      updatedAt: p.updatedAt.toISOString(),
    };
  }
  static delivery(d: Delivery) {
    return {
      id: d.id,
      notificationId: d.notificationId,
      subjectType: d.subjectType,
      subjectId: d.subjectId,
      subjectVersion: d.subjectVersion,
      mailPurpose: d.mailPurpose,
      failureKind: d.failureKind,
      attempts: d.attempts,
      retryOfId: d.retryOfId,
      createdAt: d.createdAt.toISOString(),
      notBefore: d.notBefore.toISOString(),
      expiresAt: d.expiresAt.toISOString(),
      deliveredAt: d.deliveredAt?.toISOString() ?? null,
      failedAt: d.failedAt?.toISOString() ?? null,
    };
  }
}
