import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { REQUESTS_GATEWAY } from '../models/requests-gateway';
import type {
  RequestDetail,
  RequestContext,
  RequestCommand,
} from '../models/adoption-request';
import type { Audit } from '../models/publication';
import { PUBLICATIONS_GATEWAY } from '../models/publications-gateway';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const RequestDetailStore = signalStore(
  withState({
    context: null as RequestContext | null,
    detail: null as RequestDetail | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    success: false,
    audit: null as Audit | null,
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
  }),
  withMethods(
    (
      store,
      gateway = inject(REQUESTS_GATEWAY),
      publications = inject(PUBLICATIONS_GATEWAY),
    ) => ({
      accessFailed(problem: ApiProblem) {
        if ([401, 403, 404].includes(problem.status))
          patchState(store, { detail: null, audit: null, problem });
      },
      load: rxMethod<RequestContext | null>(
        pipe(
          tap((context) =>
            patchState(store, {
              context,
              detail: null,
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
                    next: (detail) =>
                      patchState(store, { detail, loading: false }),
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
        context: RequestContext;
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
              ? publications
                  .audit(
                    {
                      organizationId: q.context.organizationId,
                      publicationId: q.context.publicationId,
                      review: false,
                    },
                    q.page,
                  )
                  .pipe(
                    tapResponse({
                      next: (audit) => {
                        if (store.detail() && store.context() === q.context)
                          patchState(store, { audit, auditLoading: false });
                      },
                      error: (e) => {
                        const p = toApiProblem(e);
                        patchState(store, {
                          auditLoading: false,
                          auditProblem: p,
                          ...([401, 403, 404].includes(p.status)
                            ? { detail: null, audit: null }
                            : {}),
                        });
                      },
                    }),
                  )
              : EMPTY,
          ),
        ),
      ),
      execute: rxMethod<RequestCommand>(
        pipe(
          exhaustMap((c) => {
            const ctx = store.context();
            if (
              !ctx ||
              !store.detail() ||
              store.refreshRequired() ||
              store.loading() ||
              ctx.publicationId !== c.context.publicationId ||
              ctx.organizationId !== c.context.organizationId ||
              ctx.adoptionRequestId !== c.context.adoptionRequestId ||
              store.detail()?.request.version !== c.body.expectedVersion
            )
              return EMPTY;
            patchState(store, { busy: true, problem: null, success: false });
            return gateway.execute(c).pipe(
              tapResponse({
                next: (detail) => {
                  if (ctx === store.context())
                    patchState(store, { detail, success: true });
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
                          'El resultado es incierto. Actualiza la solicitud y revisa el historial antes de repetir una acción.',
                          p.requestId,
                        )
                      : p,
                    ...([401, 403, 404].includes(p.status)
                      ? { detail: null, audit: null }
                      : {}),
                  });
                },
                finalize: () => patchState(store, { busy: false }),
              }),
            );
          }),
        ),
      ),
    }),
  ),
);
