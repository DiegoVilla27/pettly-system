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
import { ORDERS_GATEWAY } from '../models/orders-gateway';
import type { Order, OrderQuery, Company } from '../models/order';
import { toApiProblem, type ApiProblem } from '../../../core/api';
export const OrdersListStore = signalStore(
  withEntities<Order>(),
  withState({
    loading: false,
    problem: null as ApiProblem | null,
    total: 0,
    companies: [] as Company[],
    companiesLoading: false,
    companiesProblem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(ORDERS_GATEWAY)) => ({
    load: rxMethod<OrderQuery | null>(
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
                    patchState(store, setAllEntities(p.items), {
                      loading: false,
                      total: p.total,
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
