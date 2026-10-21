import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, exhaustMap, EMPTY } from 'rxjs';
import { ANIMALS_GATEWAY } from '../models/animals-gateway';
import type { AnimalProfile, AnimalRecord } from '../models/animal';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const AnimalCreateStore = signalStore(
  withState({
    busy: false,
    problem: null as ApiProblem | null,
    uncertain: false,
    created: null as AnimalRecord | null,
  }),
  withMethods((store, gateway = inject(ANIMALS_GATEWAY)) => ({
    create: rxMethod<{
      organizationId: string;
      profile: AnimalProfile;
      reason: string;
    }>(
      pipe(
        exhaustMap((c) => {
          if (store.uncertain() || store.created()) return EMPTY;
          patchState(store, { busy: true, problem: null });
          return gateway.create(c.organizationId, c.profile, c.reason).pipe(
            tapResponse({
              next: (created) => patchState(store, { created }),
              error: (e) => {
                const p = toApiProblem(e),
                  uncertain = p.status === 0 || p.status >= 500;
                patchState(store, {
                  uncertain,
                  problem: uncertain
                    ? new ApiProblem(
                        p.status,
                        p.code,
                        'No podemos confirmar si el registro fue creado. Consulta el listado del refugio antes de crear otro.',
                        p.requestId,
                      )
                    : p,
                });
              },
              finalize: () => patchState(store, { busy: false }),
            }),
          );
        }),
      ),
    ),
  })),
);
