import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  administrativeReason,
  requireSuperAdmin,
} from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersDirectory } from '../../../users/application/ports/out/users-directory';
import {
  Notification,
  emailEnabled,
  titles,
  validateNotice,
  noticeBody,
} from '../../domain/notification';
import type { Preferences, NotificationState } from '../results/notification';
import type { NotificationsRepository } from '../ports/out/notifications-repository';
import type { NotificationsUseCases } from '../ports/in/notifications-use-cases';
import type {
  BusinessNotifications,
  BusinessNotice,
} from '../ports/in/business-notifications';
import type {
  ReadNotificationCommand,
  ReadAllNotificationsCommand,
  ChangeNotificationPreferencesCommand,
  RetryNotificationCommand,
} from '../commands/notification.commands';
import type {
  NotificationsQuery,
  FailedDeliveriesQuery,
} from '../queries/notification.queries';
export class NotificationsHandlers
  implements NotificationsUseCases, BusinessNotifications
{
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly users: UsersDirectory,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  private async actor(id: string, admin = false) {
    const u = await this.users.findById(id);
    if (!u || u.status !== 'active' || !u.emailVerifiedAt)
      throw new ApplicationError(
        'FORBIDDEN',
        'An active verified account is required.',
      );
    if (admin) requireSuperAdmin(u);
    return u;
  }
  private defaults(userId: string): Preferences {
    return {
      userId,
      ordersEmail: true,
      adoptionsEmail: true,
      bookingsEmail: true,
      version: 0,
      updatedAt: this.clock.now(),
    };
  }
  publish(c: BusinessNotice) {
    return this.repo.run(async (tx) => {
      if (c.recipientIds.length > 20)
        throw new ApplicationError(
          'INVALID_INPUT',
          'Notification audience is bounded to twenty identities.',
        );
      for (const userId of [...new Set(c.recipientIds)].sort()) {
        await tx.lock(`notification-recipient:${userId}`);
        const u = await this.users.findById(userId);
        if (!u || u.status !== 'active' || !u.emailVerifiedAt) continue;
        const existing = await tx.event(userId, c.eventKey);
        if (existing) {
          if (
            existing.status !== c.status ||
            existing.subjectId !== c.subjectId ||
            existing.subjectVersion !== c.subjectVersion ||
            existing.eventType !== c.eventType ||
            existing.category !== c.category
          )
            throw new ApplicationError(
              'CONFLICT',
              'Notification identity was reused for a different event.',
            );
          continue;
        }
        const n: NotificationState = {
          id: this.entropy.id(),
          userId,
          eventKey: c.eventKey,
          category: c.category,
          eventType: c.eventType,
          subjectType: c.subjectType,
          subjectId: c.subjectId,
          subjectVersion: c.subjectVersion,
          status: c.status,
          title: titles[c.category],
          body: noticeBody(c.category, c.eventType, c.status, c.subjectId),
          details: c.booking ?? null,
          createdAt: c.now,
          readAt: null,
        };
        validateNotice(n);
        await tx.create(n);
        if (!emailEnabled(await tx.preferences(userId), c.category)) continue;
        const purpose =
          c.category === 'bookings'
            ? ('booking_update' as const)
            : ('business_notice' as const);
        await tx.enqueue({
          id: this.entropy.id(),
          notification: n,
          to: u.email,
          purpose,
          notBefore: c.now,
          expiresAt: new Date(+c.now + 86400000),
          deduplicationKey: `notice:${n.id}:update`,
          retryOfId: null,
        });
        if (c.booking && c.status === 'confirmed')
          for (const hours of [24, 1]) {
            const due = new Date(
              Date.parse(c.booking.startsAt) - hours * 3600000,
            );
            if (due > c.now)
              await tx.enqueue({
                id: this.entropy.id(),
                notification: n,
                to: u.email,
                purpose: 'booking_reminder',
                notBefore: due,
                expiresAt: new Date(c.booking.startsAt),
                deduplicationKey: `notice:${n.id}:${hours}h`,
                retryOfId: null,
              });
          }
      }
    });
  }
  list(q: NotificationsQuery) {
    return this.repo.run(async (tx) => {
      await this.actor(q.actorId);
      return tx.list(q);
    });
  }
  unread(actorId: string) {
    return this.repo.run(async (tx) => {
      await this.actor(actorId);
      return tx.unread(actorId);
    });
  }
  read(c: ReadNotificationCommand) {
    return this.repo.run(async (tx) => {
      await this.actor(c.actorId);
      await tx.lock(`notification:${c.id}`);
      const s = await tx.find(c.id);
      if (!s || s.userId !== c.actorId)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Notification was not found.',
        );
      const n = Notification.restore(s);
      if (n.read(this.clock.now())) await tx.read(c.id, n.snapshot().readAt!);
      return n.snapshot();
    });
  }
  readAll(c: ReadAllNotificationsCommand) {
    return this.repo.run(async (tx) => {
      await this.actor(c.actorId);
      const now = this.clock.now();
      if (!Number.isFinite(+c.through) || c.through > now)
        throw new ApplicationError(
          'INVALID_INPUT',
          'Read cutoff must not be in the future.',
        );
      return tx.readAll(c.actorId, c.through, now);
    });
  }
  preferences(actorId: string) {
    return this.repo.run(async (tx) => {
      await this.actor(actorId);
      return (await tx.preferences(actorId)) ?? this.defaults(actorId);
    });
  }
  changePreferences(c: ChangeNotificationPreferencesCommand) {
    return this.repo.run(async (tx) => {
      await this.actor(c.actorId);
      await tx.lock(`notification-recipient:${c.actorId}`);
      const old = (await tx.preferences(c.actorId)) ?? this.defaults(c.actorId);
      if (old.version !== c.expectedVersion)
        throw new ApplicationError(
          'CONFLICT',
          'Notification preferences changed.',
        );
      const p = {
        ...old,
        ...c.preferences,
        version: old.version + 1,
        updatedAt: this.clock.now(),
      };
      await tx.savePreferences(p);
      const categories = (['orders', 'adoptions', 'bookings'] as const).filter(
        (k) => !p[`${k}Email`],
      );
      await tx.cancelOptional(c.actorId, categories, this.clock.now());
      return p;
    });
  }
  failed(q: FailedDeliveriesQuery) {
    return this.repo.run(async (tx) => {
      await this.actor(q.actorId, true);
      return tx.failed(q.page, q.limit);
    });
  }
  retry(c: RetryNotificationCommand) {
    return this.repo.run(async (tx) => {
      await this.actor(c.actorId, true);
      const reason = administrativeReason(c.reason);
      await tx.lock(`notification-delivery:${c.id}`);
      const d = await tx.delivery(c.id);
      if (!d)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Delivery was not found.',
        );
      const child = await tx.child(d.id);
      if (child) return child;
      if (
        !d.notificationId ||
        !d.failedAt ||
        d.deliveredAt ||
        d.failureKind !== 'delivery_failed' ||
        d.expiresAt <= this.clock.now()
      )
        throw new ApplicationError(
          'CONFLICT',
          'Only an unexpired failed business delivery can be retried. Reissue authentication actions through Auth.',
        );
      const n = await tx.find(d.notificationId);
      if (!n)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Notification was not found.',
        );
      await tx.lock(`notification-recipient:${n.userId}`);
      const u = await this.actor(n.userId);
      if (!emailEnabled(await tx.preferences(n.userId), n.category))
        throw new ApplicationError(
          'CONFLICT',
          'The recipient disabled this email category.',
        );
      await tx.enqueue({
        id: this.entropy.id(),
        notification: n,
        to: u.email,
        purpose: d.mailPurpose as
          'business_notice' | 'booking_update' | 'booking_reminder',
        notBefore: this.clock.now(),
        expiresAt: d.expiresAt,
        deduplicationKey: `retry:${d.id}`,
        retryOfId: d.id,
      });
      const next = await tx.child(d.id);
      if (!next)
        throw new ApplicationError(
          'DEPENDENCY_UNAVAILABLE',
          'Retry could not be persisted.',
        );
      await tx.retryAudit({
        id: this.entropy.id(),
        failedOutboxId: d.id,
        newOutboxId: next.id,
        actorId: c.actorId,
        reason,
        createdAt: this.clock.now(),
      });
      return next;
    });
  }
}
