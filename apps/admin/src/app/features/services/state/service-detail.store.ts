import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { SERVICES_GATEWAY } from '../models/services-gateway';
import type {
  Service,
  ServiceContext,
  ServiceCommand,
  Resource,
  Audit,
} from '../models/service';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const ServiceDetailStore = signalStore(
  withState({
    context: null as ServiceContext | null,
    service: null as Service | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    success: null as Service | null,
    resources: [] as Resource[],
    resourcesLoading: false,
    resourcesProblem: null as ApiProblem | null,
    audits: [] as Audit[],
    auditTotal: 0,
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(SERVICES_GATEWAY)) => ({
    load: rxMethod<ServiceContext | null>(
      pipe(
        tap((context) =>
          patchState(store, {
            context,
            service: null,
            success: null,
            loading: !!context,
            problem: null,
            refreshRequired: false,
          }),
        ),
        switchMap((context) =>
          context
            ? gateway.get(context).pipe(
                tapResponse({
                  next: (service) =>
                    patchState(store, { service, loading: false }),
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
    loadResources: rxMethod<string | null>(
      pipe(
        tap((id) =>
          patchState(store, {
            resources: [],
            resourcesLoading: !!id,
            resourcesProblem: null,
          }),
        ),
        switchMap((id) =>
          id
            ? gateway.resources(id).pipe(
                tapResponse({
                  next: (resources) =>
                    patchState(store, { resources, resourcesLoading: false }),
                  error: (error) =>
                    patchState(store, {
                      resourcesLoading: false,
                      resourcesProblem: toApiProblem(error),
                    }),
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    loadAudit: rxMethod<{
      context: ServiceContext;
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
                  error: (error) =>
                    patchState(store, {
                      auditLoading: false,
                      auditProblem: toApiProblem(error),
                    }),
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    execute: rxMethod<ServiceCommand>(
      pipe(
        exhaustMap((command) => {
          if (store.refreshRequired()) return EMPTY;
          const context = store.context();
          const before = store.service();
          patchState(store, { busy: true, problem: null, success: null });
          return gateway.execute(command).pipe(
            tapResponse({
              next: (service) => {
                if (
                  store.context() === context &&
                  (command.kind === 'create'
                    ? !store.service()
                    : !!before && store.service() === before)
                )
                  patchState(store, {
                    service,
                    success: service,
                    refreshRequired: context?.review ?? false,
                  });
              },
              error: (error) => {
                if (store.context() !== context) return;
                const p = toApiProblem(error),
                  uncertain = p.status === 0 || p.status >= 500;
                patchState(store, {
                  refreshRequired: uncertain || p.status === 409,
                  problem: uncertain
                    ? new ApiProblem(
                        p.status,
                        p.code,
                        'No pudimos confirmar el cambio. Consulta el estado actual antes de enviar otra operación.',
                        p.requestId,
                      )
                    : p,
                  ...([401, 403, 404].includes(p.status)
                    ? { service: null }
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
