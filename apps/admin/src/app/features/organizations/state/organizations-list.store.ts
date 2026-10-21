import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withEntities, setAllEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap } from 'rxjs';
import { ORGANIZATIONS_GATEWAY } from '../models/organizations-gateway';
import type { Organization, OrganizationFilters } from '../models/organization';
import { type ApiProblem, toApiProblem } from '../../../core/api';
export const OrganizationsListStore = signalStore(
  withEntities<Organization>(),
  withState({
    loading: false,
    problem: null as ApiProblem | null,
    total: 0,
    page: 1,
    limit: 20,
  }),
  withMethods((store, gateway = inject(ORGANIZATIONS_GATEWAY)) => ({
    load: rxMethod<OrganizationFilters>(
      pipe(
        tap((filters) =>
          patchState(store, setAllEntities<Organization>([]), {
            loading: true,
            problem: null,
            page: filters.page,
            limit: filters.limit,
            total: 0,
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
                patchState(store, {
                  problem: toApiProblem(error),
                  loading: false,
                }),
            }),
          ),
        ),
      ),
    ),
  })),
);
