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
import type { Resource } from '../models/service';
import { type ApiProblem, toApiProblem } from '../../../core/api';
export const ResourceDirectoryStore = signalStore(
  withEntities<Resource>(),
  withState({ loading: false, problem: null as ApiProblem | null }),
  withMethods((store, gateway = inject(SERVICES_GATEWAY)) => ({
    load: rxMethod<string | null>(
      pipe(
        tap((id) =>
          patchState(store, removeAllEntities(), {
            loading: !!id,
            problem: null,
          }),
        ),
        switchMap((id) =>
          id
            ? gateway.resources(id).pipe(
                tapResponse({
                  next: (items) =>
                    patchState(store, setAllEntities(items), {
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
