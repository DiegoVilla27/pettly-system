import { Injectable, inject } from '@angular/core';
import { defer, map, of, switchMap } from 'rxjs';
import { uuid } from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import type { PaymentsGateway } from '../models/payments-gateway';
import type {
  PaymentScope,
  PaymentContext,
  PaymentQuery,
} from '../models/payment';
import {
  contextSchema,
  querySchema,
  mapCompany,
  mapPage,
  mapPayment,
  mapHistory,
  mapFinancials,
  mapPolicy,
  inputProblem,
} from '../mappers/payments.mapper';
@Injectable()
export class HttpPaymentsGateway implements PaymentsGateway {
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
                o.permissions.includes('payments.business.read') &&
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
  private requireScope(c: PaymentScope) {
    const u = this.session.identity();
    if (
      c.scope === 'platform'
        ? u?.role !== 'super_admin'
        : u?.role !== 'super_admin' &&
          !u?.organizations.some(
            (o) =>
              o.organizationId === c.organizationId &&
              o.status === 'active' &&
              o.type === 'business' &&
              o.permissions.includes('payments.business.read'),
          )
    )
      throw new ApiProblem(
        403,
        'FORBIDDEN',
        'No tienes permiso para consultar estos pagos.',
      );
  }
  private context(c: PaymentContext) {
    if (!contextSchema.safeParse(c).success) throw inputProblem();
    this.requireScope(c);
  }
  list(q: PaymentQuery) {
    return defer(() => {
      const p = querySchema.safeParse(q);
      if (!p.success) throw inputProblem();
      this.requireScope(p.data);
      const query = {
        page: p.data.page,
        limit: p.data.limit,
        status: p.data.status,
        ...(p.data.scope === 'platform'
          ? { scope: 'platform' as const }
          : { scope: 'own' as const, organizationId: p.data.organizationId }),
      };
      return this.api
        .request('listVisiblePayments', { query })
        .pipe(map((dto) => mapPage(dto, p.data)));
    });
  }
  get(c: PaymentContext) {
    return defer(() => {
      this.context(c);
      return this.api
        .request('getVisiblePayment', { path: { paymentId: c.paymentId } })
        .pipe(map((dto) => mapPayment(dto, c)));
    });
  }
  history(c: PaymentContext, page: number) {
    return defer(() => {
      this.context(c);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        throw inputProblem();
      return this.api
        .request('listVisiblePaymentHistory', {
          path: { paymentId: c.paymentId },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapHistory(dto, c, page)));
    });
  }
  policy() {
    return this.api.request('getPaymentPolicy', {}).pipe(map(mapPolicy));
  }
  financials(c: PaymentContext) {
    return defer(() => {
      this.context(c);
      this.requireScope({ scope: 'platform' });
      return this.api
        .request('getPaymentFinancialEvidence', {
          path: { paymentId: c.paymentId },
        })
        .pipe(map((dto) => mapFinancials(dto, c)));
    });
  }
  reconcile(c: PaymentContext) {
    return defer(() => {
      this.context(c);
      this.requireScope({ scope: 'platform' });
      return this.api
        .request('requestPaymentReconciliation', {
          path: { paymentId: c.paymentId },
          body: {},
        })
        .pipe(map((dto) => mapPayment(dto, c)));
    });
  }
}
