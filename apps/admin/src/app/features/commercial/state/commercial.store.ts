import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import {
  COMMERCIAL_GATEWAY,
  type Policy,
  type PolicyRequest,
} from '../models/commercial';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const CommercialStore = signalStore(
  withState({
    id: '',
    epoch: 0,
    policy: null as Policy | null,
    loaded: false,
    loading: false,
    busy: false,
    refreshRequired: false,
    problem: null as ApiProblem | null,
    success: false,
  }),
  withMethods((store, gateway = inject(COMMERCIAL_GATEWAY)) => ({
    load: rxMethod<string>(
      pipe(
        tap((id) =>
          patchState(store, {
            id,
            epoch: store.epoch() + 1,
            policy: null,
            loaded: false,
            loading: !!id,
            problem: null,
            refreshRequired: false,
            success: false,
          }),
        ),
        switchMap((id) =>
          id
            ? gateway.get(id).pipe(
                tapResponse({
                  next: (policy) =>
                    patchState(store, {
                      policy,
                      loaded: true,
                      loading: false,
                    }),
                  error: (e) =>
                    patchState(store, {
                      problem: toApiProblem(e),
                      loading: false,
                    }),
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    save: rxMethod<{ id: string; body: PolicyRequest }>(
      pipe(
        exhaustMap((c) => {
          if (
            !store.loaded() ||
            store.refreshRequired() ||
            store.loading() ||
            c.id !== store.id() ||
            c.body.expectedVersion !== (store.policy()?.version ?? 0)
          )
            return EMPTY;
          const epoch = store.epoch();
          patchState(store, { busy: true, problem: null, success: false });
          return gateway.save(c.id, c.body).pipe(
            tapResponse({
              next: (policy) => {
                if (epoch === store.epoch() && store.loaded())
                  patchState(store, { policy, success: true });
              },
              error: (e) => {
                if (epoch !== store.epoch()) return;
                const p = toApiProblem(e);
                patchState(store, {
                  problem: p,
                  refreshRequired:
                    p.status === 0 || p.status === 409 || p.status >= 500,
                  ...([401, 403, 404].includes(p.status)
                    ? { policy: null, loaded: false }
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
