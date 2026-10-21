import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { ANIMALS_GATEWAY } from '../models/animals-gateway';
import type {
  Animal,
  AnimalContext,
  AnimalCommand,
  AnimalAudit,
} from '../models/animal';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const AnimalDetailStore = signalStore(
  withState({
    context: null as AnimalContext | null,
    animal: null as Animal | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    success: false,
    audit: null as AnimalAudit | null,
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(ANIMALS_GATEWAY)) => ({
    accessFailed(problem: ApiProblem) {
      if ([401, 403, 404].includes(problem.status))
        patchState(store, { animal: null, audit: null, problem });
    },
    load: rxMethod<AnimalContext | null>(
      pipe(
        tap((context) =>
          patchState(store, {
            context,
            animal: null,
            audit: null,
            loading: !!context,
            problem: null,
            success: false,
            refreshRequired: false,
          }),
        ),
        switchMap((c) =>
          c
            ? gateway.get(c).pipe(
                tapResponse({
                  next: (animal) =>
                    patchState(store, { animal, loading: false }),
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
    loadAudit: rxMethod<{
      context: AnimalContext;
      page: number;
      revision: number;
    } | null>(
      pipe(
        tap((q) =>
          patchState(store, {
            audit: null,
            auditProblem: null,
            auditLoading: !!q,
          }),
        ),
        switchMap((q) =>
          q
            ? gateway.audit(q.context, q.page).pipe(
                tapResponse({
                  next: (audit) => {
                    if (store.animal() && store.context() === q.context)
                      patchState(store, { audit, auditLoading: false });
                  },
                  error: (e) => {
                    const p = toApiProblem(e);
                    patchState(store, {
                      auditLoading: false,
                      auditProblem: p,
                      ...([401, 403, 404].includes(p.status)
                        ? { animal: null, audit: null }
                        : {}),
                    });
                  },
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    execute: rxMethod<AnimalCommand>(
      pipe(
        exhaustMap((c) => {
          const ctx = store.context();
          if (
            !ctx ||
            !store.animal() ||
            store.refreshRequired() ||
            store.loading() ||
            ctx.animalId !== c.context.animalId ||
            ctx.organizationId !== c.context.organizationId ||
            store.animal()?.version !== c.body.expectedVersion
          )
            return EMPTY;
          patchState(store, { busy: true, problem: null, success: false });
          return gateway.execute(c).pipe(
            tapResponse({
              next: (animal) => {
                if (ctx === store.context())
                  patchState(store, { animal, success: true });
              },
              error: (e) => {
                if (ctx !== store.context()) return;
                const p = toApiProblem(e),
                  uncertain = p.status === 0 || p.status >= 500;
                patchState(store, {
                  refreshRequired: uncertain || p.status === 409,
                  problem: uncertain
                    ? new ApiProblem(
                        p.status,
                        p.code,
                        'El resultado es incierto. Actualiza el animal y revisa el historial antes de repetir una acción.',
                        p.requestId,
                      )
                    : p,
                  ...([401, 403, 404].includes(p.status)
                    ? { animal: null, audit: null }
                    : {}),
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
