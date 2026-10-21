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
import { PUBLICATIONS_GATEWAY } from '../models/publications-gateway';
import type { Publication, Filters, Shelter } from '../models/publication';
import { toApiProblem, type ApiProblem } from '../../../core/api';
export const PublicationsListStore = signalStore(
  withEntities<Publication>(),
  withState({
    loading: false,
    problem: null as ApiProblem | null,
    total: 0,
    shelters: [] as Shelter[],
    sheltersLoading: false,
    sheltersProblem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(PUBLICATIONS_GATEWAY)) => ({
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
    findShelters: rxMethod<{ search: string; currentId?: string }>(
      pipe(
        tap(() =>
          patchState(store, {
            shelters: [],
            sheltersLoading: true,
            sheltersProblem: null,
          }),
        ),
        switchMap((q) =>
          gateway.shelters(q.search, q.currentId).pipe(
            tapResponse({
              next: (shelters) =>
                patchState(store, { shelters, sheltersLoading: false }),
              error: (e) =>
                patchState(store, {
                  sheltersLoading: false,
                  sheltersProblem: toApiProblem(e),
                }),
            }),
          ),
        ),
      ),
    ),
  })),
);
