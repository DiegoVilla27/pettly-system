import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { VETERINARY_GATEWAY } from '../models/veterinary-gateway';
import type { Credential, PreparationCommand } from '../models/credential';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const CredentialPreparationStore = signalStore(
  withState({
    currentId: '',
    epoch: 0,
    credential: null as Credential | null,
    loading: false,
    busy: false,
    refreshRequired: false,
    problem: null as ApiProblem | null,
    success: false,
  }),
  withMethods((store, gateway = inject(VETERINARY_GATEWAY)) => ({
    load: rxMethod<string>(
      pipe(
        tap((id) =>
          patchState(store, {
            currentId: id,
            epoch: store.epoch() + 1,
            credential: null,
            loading: id !== 'new',
            refreshRequired: false,
            problem: null,
            success: false,
          }),
        ),
        switchMap((id) =>
          id === 'new'
            ? EMPTY
            : gateway.get(id).pipe(
                tapResponse({
                  next: (credential) =>
                    patchState(store, { credential, loading: false }),
                  error: (e) =>
                    patchState(store, {
                      problem: toApiProblem(e),
                      loading: false,
                    }),
                }),
              ),
        ),
      ),
    ),
    execute: rxMethod<PreparationCommand>(
      pipe(
        exhaustMap((c) => {
          const current = store.currentId();
          const epoch = store.epoch();
          if (
            (c.kind === 'create' &&
              (current !== 'new' || !!store.credential())) ||
            store.loading() ||
            store.refreshRequired() ||
            (c.kind !== 'create' &&
              (!store.credential() ||
                c.credentialId !== current ||
                c.body.expectedVersion !== store.credential()?.version))
          )
            return EMPTY;
          patchState(store, { busy: true, success: false, problem: null });
          return gateway.prepare(c).pipe(
            tapResponse({
              next: (credential) => {
                if (
                  epoch === store.epoch() &&
                  current === store.currentId() &&
                  (c.kind === 'create' || store.credential())
                )
                  patchState(store, { credential, success: true });
              },
              error: (e) => {
                if (epoch !== store.epoch() || current !== store.currentId())
                  return;
                const p = toApiProblem(e);
                patchState(store, {
                  problem: p,
                  refreshRequired:
                    p.status === 0 || p.status === 409 || p.status >= 500,
                  ...([401, 403, 404].includes(p.status)
                    ? { credential: null }
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
