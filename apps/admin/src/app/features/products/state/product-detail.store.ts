import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { PRODUCTS_GATEWAY } from '../models/products-gateway';
import type {
  ProductDetail,
  Context,
  Command,
  ProductAudit,
} from '../models/product';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const ProductDetailStore = signalStore(
  withState({
    context: null as Context | null,
    detail: null as ProductDetail | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    success: false,
    audit: null as ProductAudit | null,
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(PRODUCTS_GATEWAY)) => ({
    accessFailed(problem: ApiProblem) {
      if ([401, 403, 404].includes(problem.status))
        patchState(store, { detail: null, audit: null, problem });
    },
    load: rxMethod<Context | null>(
      pipe(
        tap((context) =>
          patchState(store, {
            context,
            detail: null,
            audit: null,
            loading: !!context,
            problem: null,
            success: false,
            refreshRequired: false,
          }),
        ),
        switchMap((c) =>
          c
            ? gateway.get(c).pipe(
                tapResponse({
                  next: (detail) =>
                    patchState(store, { detail, loading: false }),
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
      context: Context;
      page: number;
      revision: number;
    } | null>(
      pipe(
        tap((q) =>
          patchState(store, {
            audit: null,
            auditProblem: null,
            auditLoading: !!q,
          }),
        ),
        switchMap((q) =>
          q
            ? gateway.audit(q.context, q.page).pipe(
                tapResponse({
                  next: (audit) => {
                    if (store.detail() && store.context() === q.context)
                      patchState(store, { audit, auditLoading: false });
                  },
                  error: (e) => {
                    const p = toApiProblem(e);
                    patchState(store, {
                      auditLoading: false,
                      auditProblem: p,
                      ...([401, 403, 404].includes(p.status)
                        ? { detail: null, audit: null }
                        : {}),
                    });
                  },
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    execute: rxMethod<Command>(
      pipe(
        exhaustMap((c) => {
          const ctx = store.context();
          if (
            !ctx ||
            !store.detail() ||
            store.refreshRequired() ||
            store.loading() ||
            ctx.productId !== c.context.productId ||
            ctx.organizationId !== c.context.organizationId ||
            store.detail()?.product.version !== c.body.expectedVersion
          )
            return EMPTY;
          patchState(store, { busy: true, problem: null, success: false });
          return gateway.execute(c).pipe(
            tapResponse({
              next: (detail) => {
                if (ctx === store.context() && store.detail())
                  patchState(store, { detail, success: true });
              },
              error: (e) => {
                if (ctx !== store.context()) return;
                const p = toApiProblem(e),
                  uncertain = p.status === 0 || p.status >= 500;
                patchState(store, {
                  refreshRequired: uncertain || p.status === 409,
                  problem: uncertain
                    ? new ApiProblem(
                        p.status,
                        p.code,
                        'El resultado es incierto. Actualiza el producto y revisa el historial antes de repetir una acción.',
                        p.requestId,
                      )
                    : p,
                  ...([401, 403, 404].includes(p.status)
                    ? { detail: null, audit: null }
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
