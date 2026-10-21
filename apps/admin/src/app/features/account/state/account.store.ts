import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY, forkJoin } from 'rxjs';
import { ACCOUNT_GATEWAY } from '../models/account-gateway';
import { AUTH_SESSION } from '../../../core/auth';
import { ApiProblem, toApiProblem } from '../../../core/api';
import type { Profile, Sessions, AccountCommand } from '../models/account';
export const AccountStore = signalStore(
  withState({
    profile: null as Profile | null,
    sessions: null as Sessions | null,
    epoch: 0,
    loading: false,
    busy: false,
    refreshRequired: false,
    problem: null as ApiProblem | null,
    success: '',
  }),
  withMethods(
    (
      store,
      gateway = inject(ACCOUNT_GATEWAY),
      session = inject(AUTH_SESSION),
    ) => ({
      load: rxMethod<number>(
        pipe(
          tap(() =>
            patchState(store, {
              epoch: store.epoch() + 1,
              loading: true,
              problem: null,
              refreshRequired: false,
              profile: null,
              sessions: null,
            }),
          ),
          switchMap((page) =>
            forkJoin({
              profile: gateway.profile(),
              sessions: gateway.sessions(page),
            }).pipe(
              tapResponse({
                next: ({ profile, sessions }) =>
                  patchState(store, { profile, sessions, loading: false }),
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
      execute: rxMethod<AccountCommand>(
        pipe(
          exhaustMap((c) => {
            if (store.refreshRequired() || store.loading() || !store.profile())
              return EMPTY;
            const epoch = store.epoch();
            patchState(store, { busy: true, problem: null, success: '' });
            return gateway.execute(c).pipe(
              tapResponse({
                next: () => {
                  if (epoch !== store.epoch() || !store.profile()) return;
                  if (c.kind === 'profile') void session.restore();
                  if (
                    c.kind === 'password' ||
                    c.kind === 'delete' ||
                    c.kind === 'logout-all' ||
                    (c.kind === 'revoke' && c.current)
                  ) {
                    session.expire();
                    patchState(store, { profile: null, sessions: null });
                    return;
                  }
                  patchState(store, {
                    success:
                      c.kind === 'email'
                        ? 'Revisa el enlace enviado al nuevo correo. Tu dirección actual sigue vigente.'
                        : 'Cambio registrado. Actualiza para comprobar el estado.',
                    refreshRequired: true,
                  });
                },
                error: (e) => {
                  if (epoch !== store.epoch()) return;
                  const p = toApiProblem(e);
                  patchState(store, {
                    problem: p,
                    refreshRequired:
                      p.status === 0 || p.status === 409 || p.status >= 500,
                    ...([401, 403].includes(p.status)
                      ? { profile: null, sessions: null }
                      : {}),
                  });
                },
                finalize: () => patchState(store, { busy: false }),
              }),
            );
          }),
        ),
      ),
    }),
  ),
);
