import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { ORDERS_GATEWAY } from '../models/orders-gateway';
import type {
  Order,
  OrderContext,
  OrderCommand,
  OrderAudit,
} from '../models/order';
import { toApiProblem, ApiProblem } from '../../../core/api';
export const OrderDetailStore = signalStore(
  withState({
    context: null as OrderContext | null,
    order: null as Order | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    success: null as Order | null,
    audits: [] as OrderAudit[],
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
    auditTotal: 0,
  }),
  withMethods((store, gateway = inject(ORDERS_GATEWAY)) => ({
    load: rxMethod<OrderContext | null>(
      pipe(
        tap((context) =>
          patchState(store, {
            context,
            audits: [],
            auditTotal: 0,
            auditProblem: null,
            order: null,
            loading: !!context,
            problem: null,
            success: null,
            refreshRequired: false,
          }),
        ),
        switchMap((c) =>
          c
            ? gateway.get(c).pipe(
                tapResponse({
                  next: (order) => patchState(store, { order, loading: false }),
                  error: (e) =>
                    patchState(store, {
                      loading: false,
                      problem: toApiProblem(e),
                    }),
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    loadAudit: rxMethod<{
      context: OrderContext;
      page: number;
      version: number;
    } | null>(
      pipe(
        tap((q) =>
          patchState(store, {
            audits: [],
            auditTotal: 0,
            auditLoading: !!q,
            auditProblem: null,
          }),
        ),
        switchMap((q) =>
          q
            ? gateway.audit(q.context, q.page).pipe(
                tapResponse({
                  next: (r) =>
                    patchState(store, {
                      audits: r.items,
                      auditTotal: r.total,
                      auditLoading: false,
                    }),
                  error: (e) => {
                    const p = toApiProblem(e);
                    patchState(store, {
                      auditLoading: false,
                      auditProblem: p,
                      ...([401, 403, 404].includes(p.status)
                        ? { order: null, audits: [], auditTotal: 0 }
                        : {}),
                    });
                  },
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    execute: rxMethod<OrderCommand>(
      pipe(
        exhaustMap((c) => {
          if (
            store.refreshRequired() ||
            store.loading() ||
            !store.order() ||
            store.order()?.version !== c.body.expectedVersion
          )
            return EMPTY;
          const context = store.context();
          if (
            !context ||
            context.orderId !== c.context.orderId ||
            context.organizationId !== c.context.organizationId
          )
            return EMPTY;
          patchState(store, { busy: true, problem: null, success: null });
          return gateway.execute(c).pipe(
            tapResponse({
              next: (b) => {
                if (context === store.context())
                  patchState(store, { order: b, success: b });
              },
              error: (e) => {
                if (context !== store.context()) return;
                const p = toApiProblem(e),
                  uncertain = p.status === 0 || p.status >= 500;
                patchState(store, {
                  refreshRequired: uncertain || p.status === 409,
                  problem: uncertain
                    ? new ApiProblem(
                        p.status,
                        p.code,
                        'El resultado es incierto. Actualiza el pedido y revisa el historial antes de repetir una acción.',
                        p.requestId,
                      )
                    : p,
                  ...([401, 403, 404].includes(p.status)
                    ? { order: null, audits: [], auditTotal: 0 }
                    : {}),
                });
              },
              finalize: () => patchState(store, { busy: false }),
            }),
          );
        }),
      ),
    ),
  })),
);
