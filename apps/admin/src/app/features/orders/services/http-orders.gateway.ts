import { Injectable, inject } from '@angular/core';
import { defer, map, of, switchMap } from 'rxjs';
import { uuid } from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import type { OrdersGateway } from '../models/orders-gateway';
import type { OrderQuery, OrderContext, OrderCommand } from '../models/order';
import {
  contextSchema,
  querySchema,
  decisionSchema,
  mapCompany,
  mapPage,
  mapOrder,
  mapAudit,
  inputProblem,
  contractProblem,
} from '../mappers/orders.mapper';
@Injectable()
export class HttpOrdersGateway implements OrdersGateway {
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
                o.permissions.includes('orders.fulfillment.manage') &&
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
  private requireScope(organizationId: string) {
    const u = this.session.identity();
    if (
      u?.role !== 'super_admin' &&
      !u?.organizations.some(
        (o) =>
          o.organizationId === organizationId &&
          o.type === 'business' &&
          o.status === 'active' &&
          o.permissions.includes('orders.fulfillment.manage'),
      )
    )
      throw new ApiProblem(
        403,
        'FORBIDDEN',
        'No tienes permiso para gestionar pedidos de esta empresa.',
      );
  }
  list(query: OrderQuery) {
    return defer(() => {
      this.requireScope(query.organizationId);
      const p = querySchema.safeParse(query);
      if (!p.success) throw inputProblem();
      return this.api
        .request('listVisibleOrders', { query: p.data })
        .pipe(map((dto) => mapPage(dto, p.data)));
    });
  }
  get(c: OrderContext) {
    return defer(() => {
      this.requireScope(c.organizationId);
      if (!contextSchema.safeParse(c).success) throw inputProblem();
      return this.api
        .request('getVisibleOrder', { path: { orderId: c.orderId } })
        .pipe(map((dto) => mapOrder(dto, c)));
    });
  }
  audit(c: OrderContext, page: number) {
    return defer(() => {
      this.requireScope(c.organizationId);
      if (
        !contextSchema.safeParse(c).success ||
        !Number.isInteger(page) ||
        page < 1 ||
        page > 10000
      )
        throw inputProblem();
      return this.api
        .request('listVisibleOrderAudits', {
          path: { orderId: c.orderId },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapAudit(dto, c, page)));
    });
  }
  execute(c: OrderCommand) {
    return defer(() => {
      this.requireScope(c.context.organizationId);
      if (
        !contextSchema.safeParse(c.context).success ||
        !decisionSchema.safeParse(c.body).success
      )
        throw inputProblem();
      const options = {
        path: { orderId: c.context.orderId },
        body: c.body,
      };
      const request =
        c.action === 'cancel'
          ? this.api.request('cancelUnpaidOrder', options)
          : this.api.request('advanceOrderFulfillment', {
              ...options,
              body: { ...c.body, status: c.action },
            });
      return request.pipe(
        map((dto) => {
          const b = mapOrder(dto, c.context);
          if (b.version !== c.body.expectedVersion + 1) throw contractProblem();
          if (b.status !== (c.action === 'cancel' ? 'cancelled' : c.action))
            throw contractProblem();
          return b;
        }),
      );
    });
  }
}
