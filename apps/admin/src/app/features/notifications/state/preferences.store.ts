import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { NOTIFICATIONS_GATEWAY } from '../models/notifications-gateway';
import type { Preferences, PreferencesCommand } from '../models/notification';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const PreferencesStore = signalStore(
  withState({
    preferences: null as Preferences | null,
    loading: false,
    busy: false,
    refreshRequired: false,
    problem: null as ApiProblem | null,
    message: '',
  }),
  withMethods((store, gateway = inject(NOTIFICATIONS_GATEWAY)) => ({
    load: rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, {
            preferences: null,
            loading: true,
            problem: null,
            refreshRequired: false,
            message: '',
          }),
        ),
        switchMap(() =>
          gateway.preferences().pipe(
            tapResponse({
              next: (preferences) =>
                patchState(store, { preferences, loading: false }),
              error: (e) =>
                patchState(store, {
                  loading: false,
                  problem: toApiProblem(e),
                }),
            }),
          ),
        ),
      ),
    ),
    save: rxMethod<PreferencesCommand>(
      pipe(
        exhaustMap((c) => {
          if (
            store.refreshRequired() ||
            !store.preferences() ||
            store.loading()
          )
            return EMPTY;
          patchState(store, { busy: true, problem: null, message: '' });
          return gateway.savePreferences(c).pipe(
            tapResponse({
              next: (preferences) =>
                patchState(store, {
                  preferences,
                  message:
                    'Preferencias guardadas. Los canales obligatorios siguen activos.',
                }),
              error: (e) => {
                const p = toApiProblem(e);
                patchState(store, {
                  problem: p,
                  refreshRequired:
                    p.status === 409 || p.status === 0 || p.status >= 500,
                  ...([401, 403, 404].includes(p.status)
                    ? { preferences: null }
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
