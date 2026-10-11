import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import {
  withEntities,
  setAllEntities,
  removeAllEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap } from 'rxjs';
import { VETERINARY_GATEWAY } from '../models/veterinary-gateway';
import type { Credential, CredentialFilters } from '../models/credential';
import { toApiProblem, type ApiProblem } from '../../../core/api';
export const VeterinaryListStore = signalStore(
  withEntities<Credential>(),
  withState({
    loading: false,
    problem: null as ApiProblem | null,
    total: 0,
    page: 1,
    limit: 20,
  }),
  withMethods((store, gateway = inject(VETERINARY_GATEWAY)) => ({
    load: rxMethod<CredentialFilters>(
      pipe(
        tap(() =>
          patchState(store, removeAllEntities(), {
            loading: true,
            problem: null,
            total: 0,
          }),
        ),
        switchMap((query) =>
          gateway.list(query).pipe(
            tapResponse({
              next: (page) =>
                patchState(store, setAllEntities(page.items), {
                  total: page.total,
                  page: page.page,
                  limit: page.limit,
                  loading: false,
                }),
              error: (error) =>
                patchState(store, {
                  loading: false,
                  problem: toApiProblem(error),
                }),
            }),
          ),
        ),
      ),
    ),
  })),
);
