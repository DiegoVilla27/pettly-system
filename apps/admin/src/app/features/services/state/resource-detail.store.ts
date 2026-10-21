import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, of, EMPTY, map } from 'rxjs';
import { SERVICES_GATEWAY } from '../models/services-gateway';
import { RESOURCE_GATEWAY } from '../models/resource-gateway';
import type { Resource } from '../models/service';
import type {
  ResourceContext,
  ResourceCommand,
  ResourceResult,
  Block,
  ResourceAudit,
} from '../models/resource';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const ResourceDetailStore = signalStore(
  withState({
    context: null as ResourceContext | null,
    resource: null as Resource | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    result: null as ResourceResult | null,
    blocks: [] as Block[],
    blocksLoading: false,
    blocksProblem: null as ApiProblem | null,
    audits: [] as ResourceAudit[],
    auditTotal: 0,
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
  }),
  withMethods(
    (
      store,
      services = inject(SERVICES_GATEWAY),
      gateway = inject(RESOURCE_GATEWAY),
    ) => ({
      load: rxMethod<ResourceContext | null>(
        pipe(
          tap((context) =>
            patchState(store, {
              context,
              resource: null,
              result: null,
              loading: !!context,
              problem: null,
              refreshRequired: false,
            }),
          ),
          switchMap((context) =>
            context
              ? services.resources(context.organizationId).pipe(
                  tapResponse({
                    next: (resources) => {
                      const r = resources.find(
                        (r) => r.id === context.resourceId,
                      );
                      if (context.resourceId && !r)
                        patchState(store, {
                          loading: false,
                          problem: new ApiProblem(
                            404,
                            'RESOURCE_NOT_FOUND',
                            'No encontramos este recurso en la empresa.',
                          ),
                        });
                      else
                        patchState(store, {
                          resource: r ?? null,
                          loading: false,
                        });
                    },
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
      blocksQuery: rxMethod<{
        context: ResourceContext;
        from: string;
        to: string;
        version: number;
      } | null>(
        pipe(
          tap((q) =>
            patchState(store, {
              blocks: [],
              blocksLoading: !!q,
              blocksProblem: null,
            }),
          ),
          switchMap((q) =>
            q
              ? gateway.blocks(q.context, q.from, q.to).pipe(
                  tapResponse({
                    next: (blocks) =>
                      patchState(store, { blocks, blocksLoading: false }),
                    error: (e) =>
                      patchState(store, {
                        blocksLoading: false,
                        blocksProblem: toApiProblem(e),
                      }),
                  }),
                )
              : EMPTY,
          ),
        ),
      ),
      auditQuery: rxMethod<{
        context: ResourceContext;
        page: number;
        version: number;
      } | null>(
        pipe(
          tap((q) =>
            patchState(store, {
              audits: [],
              auditTotal: 0,
              auditLoading: !!q,
              auditProblem: null,
            }),
          ),
          switchMap((q) =>
            q
              ? gateway.audit(q.context, q.page).pipe(
                  tapResponse({
                    next: (r) =>
                      patchState(store, {
                        audits: r.items,
                        auditTotal: r.total,
                        auditLoading: false,
                      }),
                    error: (e) =>
                      patchState(store, {
                        auditLoading: false,
                        auditProblem: toApiProblem(e),
                      }),
                  }),
                )
              : EMPTY,
          ),
        ),
      ),
      execute: rxMethod<ResourceCommand>(
        pipe(
          exhaustMap((command) => {
            if (store.refreshRequired()) return EMPTY;
            const context = store.context();
            patchState(store, { busy: true, problem: null, result: null });
            return gateway.execute(command).pipe(
              switchMap((result) =>
                result.kind === 'resource'
                  ? of({ resource: result.resource, result })
                  : services.resources(result.block.organizationId).pipe(
                      map((items) => {
                        const resource = items.find(
                          (r) => r.id === result.block.resourceId,
                        );
                        if (!resource)
                          throw new ApiProblem(
                            502,
                            'INVALID_RESPONSE',
                            'No pudimos confirmar la versión del recurso.',
                          );
                        return { resource, result };
                      }),
                    ),
              ),
              tapResponse({
                next: (r) => {
                  if (store.context() === context)
                    patchState(store, {
                      resource: r.resource,
                      result: r.result,
                    });
                },
                error: (e) => {
                  if (store.context() !== context) return;
                  const p = toApiProblem(e),
                    uncertain = p.status === 0 || p.status >= 500;
                  patchState(store, {
                    refreshRequired: uncertain || p.status === 409,
                    problem: uncertain
                      ? new ApiProblem(
                          p.status,
                          p.code,
                          'El resultado es incierto. Consulta el recurso y su historial antes de repetir un cambio.',
                          p.requestId,
                        )
                      : p,
                    ...([401, 403, 404].includes(p.status)
                      ? { resource: null }
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
