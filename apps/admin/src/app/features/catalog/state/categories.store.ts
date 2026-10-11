import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import {
  withEntities,
  setAllEntities,
  setEntity,
  removeAllEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { CATALOG_GATEWAY } from '../models/catalog-gateway';
import type { Category, CategoryCommand, Page, Audit } from '../models/catalog';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const CategoriesStore = signalStore(
  withEntities<Category>(),
  withState({
    epoch: 0,
    refreshRequired: false,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    success: '',
    saved: null as Category | null,
    audit: null as Page<Audit> | null,
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
    auditId: '',
  }),
  withMethods((store, gateway = inject(CATALOG_GATEWAY)) => ({
    load: rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, removeAllEntities(), {
            epoch: store.epoch() + 1,
            refreshRequired: false,
            loading: true,
            problem: null,
            success: '',
            saved: null,
          }),
        ),
        switchMap(() =>
          gateway.categories().pipe(
            tapResponse({
              next: (items) =>
                patchState(store, setAllEntities(items), { loading: false }),
              error: (error) =>
                patchState(store, {
                  loading: false,
                  problem: toApiProblem(error),
                }),
            }),
          ),
        ),
      ),
    ),
    execute: rxMethod<CategoryCommand>(
      pipe(
        exhaustMap((command) => {
          if (store.loading() || store.refreshRequired()) return EMPTY;
          const epoch = store.epoch();
          patchState(store, {
            busy: true,
            problem: null,
            success: '',
            saved: null,
          });
          return gateway.category(command).pipe(
            tapResponse({
              next: (category) => {
                if (epoch !== store.epoch()) return;
                patchState(store, setEntity(category), {
                  saved: category,
                  success:
                    command.kind === 'create'
                      ? 'Categoría creada.'
                      : 'Categoría actualizada.',
                });
              },
              error: (error) => {
                if (epoch !== store.epoch()) return;
                const p = toApiProblem(error);
                patchState(store, {
                  refreshRequired:
                    p.status === 0 || p.status === 409 || p.status >= 500,
                  problem:
                    p.status === 409
                      ? new ApiProblem(
                          409,
                          p.code,
                          'La categoría cambió o el identificador ya existe. Actualiza los datos y revisa los campos antes de confirmar.',
                          p.requestId,
                        )
                      : p,
                  ...([401, 403].includes(p.status)
                    ? { entityMap: {}, ids: [], audit: null }
                    : {}),
                });
              },
              finalize: () => patchState(store, { busy: false }),
            }),
          );
        }),
      ),
    ),
    auditLoad: rxMethod<{ id: string; page: number }>(
      pipe(
        tap(({ id }) =>
          patchState(store, {
            auditId: id,
            audit: null,
            auditLoading: true,
            auditProblem: null,
          }),
        ),
        switchMap(({ id, page }) =>
          gateway.categoryAudit(id, page).pipe(
            tapResponse({
              next: (audit) =>
                patchState(store, { audit, auditLoading: false }),
              error: (error) =>
                patchState(store, {
                  auditLoading: false,
                  auditProblem: toApiProblem(error),
                }),
            }),
          ),
        ),
      ),
    ),
  })),
);
