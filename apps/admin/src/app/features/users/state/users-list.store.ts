import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { withEntities, setAllEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { USERS_GATEWAY } from '../models/users-gateway';
import type { User, UserFilters } from '../models/user';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const UsersListStore = signalStore(
  withEntities<User>(),
  withState({
    loading: false,
    problem: null as ApiProblem | null,
    total: 0,
    page: 1,
    limit: 20,
  }),
  withComputed((store) => ({
    pages: computed(() =>
      Math.max(1, Math.ceil(store.total() / store.limit())),
    ),
  })),
  withMethods((store, gateway = inject(USERS_GATEWAY)) => ({
    load: rxMethod<UserFilters>(
      pipe(
        tap((filters) =>
          patchState(store, setAllEntities<User>([]), {
            loading: true,
            problem: null,
            page: filters.page,
            limit: filters.limit,
          }),
        ),
        switchMap((filters) =>
          gateway.list(filters).pipe(
            tapResponse({
              next: (result) =>
                patchState(store, setAllEntities(result.items), {
                  total: result.total,
                  page: result.page,
                  limit: result.limit,
                  loading: false,
                }),
              error: (error) =>
                patchState(store, setAllEntities<User>([]), {
                  problem: toApiProblem(error),
                  loading: false,
                  total: 0,
                }),
            }),
          ),
        ),
      ),
    ),
  })),
);
