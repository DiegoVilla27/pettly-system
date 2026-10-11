import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import {
  withEntities,
  setAllEntities,
  removeAllEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, EMPTY } from 'rxjs';
import { INVENTORY_GATEWAY } from '../models/inventory-gateway';
import type {
  Company,
  InventoryQuery,
  InventoryRow,
} from '../models/inventory';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const InventoryListStore = signalStore(
  withEntities<InventoryRow>(),
  withState({
    loading: false,
    problem: null as ApiProblem | null,
    total: 0,
    page: 1,
    limit: 20,
    companies: [] as Company[],
    companiesLoading: false,
    companiesProblem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(INVENTORY_GATEWAY)) => ({
    load: rxMethod<InventoryQuery | null>(
      pipe(
        tap((query) =>
          patchState(store, removeAllEntities(), {
            loading: !!query,
            problem: null,
            total: 0,
            page: query?.page ?? 1,
            limit: query?.limit ?? 20,
          }),
        ),
        switchMap((query) =>
          query
            ? gateway.list(query).pipe(
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
                      loading: false,
                      problem: toApiProblem(error),
                    }),
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    findCompanies: rxMethod<{ search: string; currentId?: string }>(
      pipe(
        tap(() =>
          patchState(store, {
            companies: [],
            companiesLoading: true,
            companiesProblem: null,
          }),
        ),
        switchMap(({ search, currentId }) =>
          gateway.companies(search, currentId).pipe(
            tapResponse({
              next: (companies) =>
                patchState(store, { companies, companiesLoading: false }),
              error: (error) =>
                patchState(store, {
                  companiesLoading: false,
                  companiesProblem: toApiProblem(error),
                }),
            }),
          ),
        ),
      ),
    ),
  })),
);
