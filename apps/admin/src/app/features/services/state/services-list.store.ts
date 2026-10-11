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
import { SERVICES_GATEWAY } from '../models/services-gateway';
import type { Service, Company, ServiceQuery } from '../models/service';
import { type ApiProblem, toApiProblem } from '../../../core/api';
export const ServicesListStore = signalStore(
  withEntities<Service>(),
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
  withMethods((store, gateway = inject(SERVICES_GATEWAY)) => ({
    load: rxMethod<{
      query: ServiceQuery | { page: number; limit: number };
      review: boolean;
    } | null>(
      pipe(
        tap((request) =>
          patchState(store, removeAllEntities(), {
            loading: !!request,
            problem: null,
            total: 0,
            page: request?.query.page ?? 1,
            limit: request?.query.limit ?? 20,
          }),
        ),
        switchMap((request) =>
          request
            ? gateway.list(request.query, request.review).pipe(
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
        switchMap((q) =>
          gateway.companies(q.search, q.currentId).pipe(
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
