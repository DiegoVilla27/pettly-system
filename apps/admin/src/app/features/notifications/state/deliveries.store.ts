import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { NOTIFICATIONS_GATEWAY } from '../models/notifications-gateway';
import type { Delivery, DeliveryQuery } from '../models/notification';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const DeliveriesStore = signalStore(
  withState({
    query: null as DeliveryQuery | null,
    items: [] as Delivery[],
    total: 0,
    loading: false,
    busy: false,
    refreshRequired: false,
    problem: null as ApiProblem | null,
    receipt: null as Delivery | null,
  }),
  withMethods((store, gateway = inject(NOTIFICATIONS_GATEWAY)) => ({
    load: rxMethod<DeliveryQuery | null>(
      pipe(
        tap((q) =>
          patchState(store, {
            query: q,
            items: [],
            total: 0,
            loading: !!q,
            problem: null,
            refreshRequired: false,
            receipt: null,
          }),
        ),
        switchMap((q) =>
          q
            ? gateway.deliveries(q).pipe(
                tapResponse({
                  next: (r) =>
                    patchState(store, {
                      items: r.items,
                      total: r.total,
                      loading: false,
                    }),
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
    retry: rxMethod<{ id: string; reason: string }>(
      pipe(
        exhaustMap((c) => {
          if (store.refreshRequired() || store.loading() || store.receipt())
            return EMPTY;
          const query = store.query();
          patchState(store, { busy: true, problem: null });
          return gateway.retry(c.id, c.reason).pipe(
            tapResponse({
              next: (receipt) => {
                if (query === store.query()) patchState(store, { receipt });
              },
              error: (e) => {
                if (query !== store.query()) return;
                const p = toApiProblem(e);
                patchState(store, {
                  problem: p,
                  refreshRequired:
                    p.status === 409 || p.status === 0 || p.status >= 500,
                  ...([401, 403, 404].includes(p.status)
                    ? { items: [], total: 0 }
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
