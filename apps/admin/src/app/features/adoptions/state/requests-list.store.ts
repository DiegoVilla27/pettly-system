import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, EMPTY } from 'rxjs';
import { REQUESTS_GATEWAY } from '../models/requests-gateway';
import type { RequestFilters, RequestPage } from '../models/adoption-request';
import type { Publication } from '../models/publication';
import { toApiProblem, type ApiProblem } from '../../../core/api';
export const RequestsListStore = signalStore(
  withState({
    publication: null as Publication | null,
    page: null as RequestPage | null,
    loading: false,
    problem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(REQUESTS_GATEWAY)) => ({
    load: rxMethod<RequestFilters | null>(
      pipe(
        tap((q) =>
          patchState(store, {
            publication: null,
            page: null,
            loading: !!q,
            problem: null,
          }),
        ),
        switchMap((q) =>
          q
            ? gateway.list(q).pipe(
                tapResponse({
                  next: (d) =>
                    patchState(store, {
                      publication: d.publication,
                      page: d.page,
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
  })),
);
