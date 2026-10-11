import { Injectable, inject } from '@angular/core';
import { defer, map, of, switchMap } from 'rxjs';
import { uuid } from 'zod/mini';
import { ApiClient } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import type { BookingsGateway } from '../models/bookings-gateway';
import type {
  BookingQuery,
  BookingContext,
  BookingCommand,
} from '../models/booking';
import {
  contextSchema,
  querySchema,
  decisionSchema,
  mapCompany,
  mapPage,
  mapBooking,
  mapAudit,
  inputProblem,
  contractProblem,
} from '../mappers/bookings.mapper';
@Injectable()
export class HttpBookingsGateway implements BookingsGateway {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AUTH_SESSION);
  companies(search: string, currentId?: string) {
    return defer(() => {
      if (search.length > 100 || /\p{Cc}/u.test(search)) throw inputProblem();
      if (this.session.identity()?.role !== 'super_admin')
        return of(
          this.session
            .identity()
            ?.organizations.filter(
              (o) =>
                o.status === 'active' &&
                o.type === 'business' &&
                o.permissions.includes('bookings.manage') &&
                o.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
            )
            .map((o) => ({ id: o.organizationId, name: o.name })) ?? [],
        );
      return this.api
        .request('listOrganizations', {
          query: {
            type: 'business',
            status: 'active',
            search: search.trim() || undefined,
            page: 1,
            limit: 20,
          },
        })
        .pipe(
          map((dto) => dto.items.map(mapCompany)),
          switchMap((items) => {
            if (!currentId || items.some((c) => c.id === currentId))
              return of(items);
            if (!uuid().safeParse(currentId).success) throw inputProblem();
            return this.api
              .request('getOrganizationProfile', {
                path: { organizationId: currentId },
              })
              .pipe(map((dto) => [mapCompany(dto), ...items]));
          }),
        );
    });
  }
  list(query: BookingQuery) {
    return defer(() => {
      const p = querySchema.safeParse(query);
      if (!p.success) throw inputProblem();
      return this.api
        .request('listManagedBookings', { query: p.data })
        .pipe(map((dto) => mapPage(dto, p.data)));
    });
  }
  get(c: BookingContext) {
    return defer(() => {
      if (!contextSchema.safeParse(c).success) throw inputProblem();
      return this.api
        .request('getManagedBooking', { path: { bookingId: c.bookingId } })
        .pipe(map((dto) => mapBooking(dto, c)));
    });
  }
  audit(c: BookingContext, page: number) {
    return defer(() => {
      if (
        !contextSchema.safeParse(c).success ||
        !Number.isInteger(page) ||
        page < 1 ||
        page > 10000
      )
        throw inputProblem();
      return this.api
        .request('listManagedBookingAudit', {
          path: { bookingId: c.bookingId },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapAudit(dto, c)));
    });
  }
  execute(c: BookingCommand) {
    return defer(() => {
      if (
        !contextSchema.safeParse(c.context).success ||
        !decisionSchema.safeParse(c.body).success
      )
        throw inputProblem();
      const options = {
        path: { bookingId: c.context.bookingId },
        body: c.body,
      };
      const request = (() => {
        switch (c.action) {
          case 'confirm':
            return this.api.request('confirmManagedBooking', options);
          case 'reject':
            return this.api.request('rejectManagedBooking', options);
          case 'cancel':
            return this.api.request('cancelManagedBooking', options);
          case 'start':
            return this.api.request('startManagedBooking', options);
          case 'complete':
            return this.api.request('completeManagedBooking', options);
          case 'no_show':
            return this.api.request('no_showManagedBooking', options);
        }
      })();
      return request.pipe(
        map((dto) => {
          const b = mapBooking(dto, c.context);
          if (b.version !== c.body.expectedVersion + 1) throw contractProblem();
          return b;
        }),
      );
    });
  }
}
