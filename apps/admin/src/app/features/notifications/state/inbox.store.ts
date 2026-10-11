import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import {
  withEntities,
  setAllEntities,
  removeAllEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, map, EMPTY } from 'rxjs';
import { NOTIFICATIONS_GATEWAY } from '../models/notifications-gateway';
import type { InboxQuery, Notice } from '../models/notification';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const InboxStore = signalStore(
  withEntities<Notice>(),
  withState({
    query: null as InboxQuery | null,
    total: 0,
    count: 0,
    loading: false,
    busy: false,
    refreshRequired: false,
    problem: null as ApiProblem | null,
    message: '',
  }),
  withMethods((store, gateway = inject(NOTIFICATIONS_GATEWAY)) => {
    const load = rxMethod<InboxQuery | null>(
      pipe(
        tap((query) =>
          patchState(store, removeAllEntities(), {
            query,
            total: 0,
            count: 0,
            loading: !!query,
            problem: null,
            refreshRequired: false,
          }),
        ),
        switchMap((q) =>
          q
            ? gateway.inbox(q).pipe(
                tapResponse({
                  next: (r) =>
                    patchState(store, setAllEntities(r.page.items), {
                      total: r.page.total,
                      count: r.count,
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
    );
    const write = rxMethod<{ id: string } | { through: string }>(
      pipe(
        exhaustMap((c) => {
          const q = store.query();
          if (!q || store.refreshRequired() || store.loading()) return EMPTY;
          patchState(store, { busy: true, problem: null, message: '' });
          return (
            'id' in c
              ? gateway.read(c.id).pipe(map(() => undefined))
              : gateway.readAll(c.through).pipe(map(() => undefined))
          ).pipe(
            tapResponse({
              next: () => {
                patchState(store, {
                  message:
                    'Lectura registrada. La bandeja conserva el historial.',
                });
                load(store.query());
              },
              error: (e) => {
                const p = toApiProblem(e);
                patchState(store, {
                  problem: p,
                  refreshRequired:
                    p.status === 0 || p.status >= 500 || p.status === 409,
                });
                if ([401, 403, 404].includes(p.status))
                  patchState(store, removeAllEntities(), {
                    total: 0,
                    count: 0,
                  });
              },
              finalize: () => patchState(store, { busy: false }),
            }),
          );
        }),
      ),
    );
    return { load, write };
  }),
);
