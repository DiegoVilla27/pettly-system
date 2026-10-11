import { Injectable, inject } from '@angular/core';
import { defer, forkJoin, map } from 'rxjs';
import { uuid, iso } from 'zod/mini';
import { ApiClient } from '../../../core/api';
import type { NotificationsGateway } from '../models/notifications-gateway';
import type {
  InboxQuery,
  PreferencesCommand,
  DeliveryQuery,
} from '../models/notification';
import {
  inboxQuerySchema,
  deliveryQuerySchema,
  preferenceCommandSchema,
  inputProblem,
  contractProblem,
  mapInbox,
  mapCount,
  mapNotice,
  mapReadAll,
  mapPreferences,
  mapDeliveries,
  mapDelivery,
  validRetryInput,
} from '../mappers/notifications.mapper';
@Injectable()
export class HttpNotificationsGateway implements NotificationsGateway {
  private readonly api = inject(ApiClient);
  inbox(q: InboxQuery) {
    return defer(() => {
      if (!inboxQuerySchema.safeParse(q).success) throw inputProblem();
      return forkJoin({
        page: this.api
          .request('listOwnNotifications', { query: q })
          .pipe(map((d) => mapInbox(d, q))),
        count: this.api
          .request('countOwnUnreadNotifications')
          .pipe(map(mapCount)),
      });
    });
  }
  read(id: string) {
    return defer(() => {
      if (!uuid().safeParse(id).success) throw inputProblem();
      return this.api
        .request('readOwnNotification', {
          path: { notificationId: id },
          body: {},
        })
        .pipe(
          map((d) => {
            const n = mapNotice(d, id);
            if (!n.readAt) throw contractProblem();
            return n;
          }),
        );
    });
  }
  readAll(through: string) {
    return defer(() => {
      if (!iso.datetime().safeParse(through).success) throw inputProblem();
      return this.api
        .request('readAllOwnNotifications', { body: { through } })
        .pipe(map(mapReadAll));
    });
  }
  preferences() {
    return this.api
      .request('getOwnNotificationPreferences')
      .pipe(map(mapPreferences));
  }
  savePreferences(c: PreferencesCommand) {
    return defer(() => {
      if (!preferenceCommandSchema.safeParse(c).success) throw inputProblem();
      return this.api
        .request('changeOwnNotificationPreferences', { body: c })
        .pipe(
          map((d) => {
            const p = mapPreferences(d);
            if (
              p.version !== c.expectedVersion + 1 ||
              p.ordersEmail !== c.ordersEmail ||
              p.adoptionsEmail !== c.adoptionsEmail ||
              p.bookingsEmail !== c.bookingsEmail
            )
              throw contractProblem();
            return p;
          }),
        );
    });
  }
  deliveries(q: DeliveryQuery) {
    return defer(() => {
      if (!deliveryQuerySchema.safeParse(q).success) throw inputProblem();
      return this.api
        .request('listFailedNotificationDeliveries', { query: q })
        .pipe(map((d) => mapDeliveries(d, q)));
    });
  }
  retry(id: string, reason: string) {
    return defer(() => {
      validRetryInput(id, reason);
      return this.api
        .request('retryFailedNotificationDelivery', {
          path: { deliveryId: id },
          body: { reason },
        })
        .pipe(
          map((d) => {
            const child = mapDelivery(d);
            if (child.retryOfId !== id || child.id === id)
              throw contractProblem();
            return child;
          }),
        );
    });
  }
}
