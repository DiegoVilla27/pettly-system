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
import { PRODUCTS_GATEWAY } from '../models/products-gateway';
import type { ProductDetail, Filters, Company } from '../models/product';
import { toApiProblem, type ApiProblem } from '../../../core/api';
export const ProductsListStore = signalStore(
  withEntities<ProductDetail>(),
  withState({
    loading: false,
    problem: null as ApiProblem | null,
    total: 0,
    companies: [] as Company[],
    companiesLoading: false,
    companiesProblem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(PRODUCTS_GATEWAY)) => ({
    load: rxMethod<Filters | null>(
      pipe(
        tap((q) =>
          patchState(store, removeAllEntities(), {
            loading: !!q,
            problem: null,
            total: 0,
          }),
        ),
        switchMap((q) =>
          q
            ? gateway.list(q).pipe(
                tapResponse({
                  next: (p) =>
                    patchState(
                      store,
                      setAllEntities(p.items, {
                        selectId: (d) => d.product.id,
                      }),
                      {
                        loading: false,
                        total: p.total,
                      },
                    ),
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
    findCompanies: rxMethod<{ search: string; currentId?: string }>(
      pipe(
        tap(() =>
          patchState(store, {
            companies: [],
            companiesLoading: true,
            companiesProblem: null,
          }),
        ),
        switchMap((q) =>
          gateway.companies(q.search, q.currentId).pipe(
            tapResponse({
              next: (companies) =>
                patchState(store, { companies, companiesLoading: false }),
              error: (e) =>
                patchState(store, {
                  companiesLoading: false,
                  companiesProblem: toApiProblem(e),
                }),
            }),
          ),
        ),
      ),
    ),
  })),
);
