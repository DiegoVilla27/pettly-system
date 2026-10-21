import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, exhaustMap, EMPTY } from 'rxjs';
import { AccessActionGateway } from '../services/access-action.gateway';
import { AUTH_SESSION } from '../../../core/auth';
import { ApiProblem, toApiProblem } from '../../../core/api';
import type { AccessRequest } from '../models/access-action';
export const AccessActionStore = signalStore(
  withState({
    busy: false,
    success: false,
    uncertain: false,
    problem: null as ApiProblem | null,
  }),
  withMethods(
    (
      store,
      gateway = inject(AccessActionGateway),
      session = inject(AUTH_SESSION),
    ) => ({
      execute: rxMethod<AccessRequest>(
        pipe(
          exhaustMap((c) => {
            if (store.success() || store.uncertain()) return EMPTY;
            patchState(store, { busy: true, problem: null });
            return gateway.execute(c).pipe(
              tapResponse({
                next: () => {
                  patchState(store, { success: true });
                  if (c.action === 'reset' || c.action === 'confirm-email') {
                    if (session.identity()) session.expire();
                  }
                },
                error: (e) => {
                  const p = toApiProblem(e);
                  patchState(store, {
                    problem: p,
                    uncertain: p.status === 0 || p.status >= 500,
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
