import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { INVENTORY_GATEWAY } from '../models/inventory-gateway';
import type {
  InventoryContext,
  InventoryRow,
  Ledger,
  MovementIntent,
  MovementInput,
  MovementResult,
} from '../models/inventory';
import { validInput, inputProblem } from '../mappers/inventory.mapper';
import { ApiProblem, toApiProblem } from '../../../core/api';
const same = (a: InventoryContext | null, b: InventoryContext) =>
  a?.organizationId === b.organizationId && a.variantId === b.variantId;
export const InventoryDetailStore = signalStore(
  withState({
    context: null as InventoryContext | null,
    row: null as InventoryRow | null,
    loading: false,
    problem: null as ApiProblem | null,
    ledger: null as Ledger | null,
    ledgerLoading: false,
    ledgerProblem: null as ApiProblem | null,
    busy: false,
    intent: null as MovementIntent | null,
    uncertain: false,
    result: null as MovementResult | null,
  }),
  withMethods((store, gateway = inject(INVENTORY_GATEWAY)) => ({
    load: rxMethod<InventoryContext>(
      pipe(
        tap((context) =>
          patchState(store, {
            ...(!same(store.context(), context)
              ? { intent: null, uncertain: false }
              : {}),
            context,
            row: null,
            loading: true,
            problem: null,
            result: null,
            ledger: null,
            ledgerProblem: null,
          }),
        ),
        switchMap((context) =>
          gateway.detail(context).pipe(
            tapResponse({
              next: (row) => patchState(store, { row, loading: false }),
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
    loadLedger: rxMethod<
      (InventoryContext & { page: number; limit: number }) | null
    >(
      pipe(
        tap((query) =>
          patchState(store, {
            ledger: null,
            ledgerLoading: !!query,
            ledgerProblem: null,
          }),
        ),
        switchMap((query) =>
          query
            ? gateway
                .ledger(
                  {
                    organizationId: query.organizationId,
                    variantId: query.variantId,
                  },
                  query.page,
                  query.limit,
                )
                .pipe(
                  tapResponse({
                    next: (ledger) =>
                      patchState(store, { ledger, ledgerLoading: false }),
                    error: (error) =>
                      patchState(store, {
                        ledgerLoading: false,
                        ledgerProblem: toApiProblem(error),
                      }),
                  }),
                )
            : EMPTY,
        ),
      ),
    ),
    record: rxMethod<MovementInput | null>(
      pipe(
        exhaustMap((input) => {
          const row = store.row(),
            context = store.context();
          if (!row || !context) return EMPTY;
          let intent = store.intent();
          if (intent && input !== null) return EMPTY;
          if (!intent) {
            if (
              !input ||
              !validInput(input) ||
              row.variantStatus !== 'active' ||
              row.productStatus === 'archived'
            ) {
              patchState(store, { problem: inputProblem() });
              return EMPTY;
            }
            intent = {
              ...context,
              body: {
                ...input,
                expectedVersion: row.stock.version,
                idempotencyKey: crypto.randomUUID(),
              },
            };
          }
          if (!same(intent, context)) return EMPTY;
          const command = intent;
          patchState(store, {
            intent: command,
            busy: true,
            uncertain: false,
            problem: null,
            result: null,
          });
          return gateway.movement(command).pipe(
            tapResponse({
              next: (result) => {
                if (same(store.context(), command))
                  patchState(store, {
                    row: { ...row, stock: result.stock },
                    result,
                    intent: null,
                    uncertain: false,
                    ledger: null,
                  });
              },
              error: (error) => {
                if (!same(store.context(), command)) return;
                const p = toApiProblem(error),
                  uncertain = p.status === 0 || p.status >= 500;
                patchState(store, {
                  uncertain,
                  intent: uncertain ? command : null,
                  problem: new ApiProblem(
                    p.status,
                    p.code,
                    uncertain
                      ? 'No pudimos confirmar si el movimiento se registró. Reintenta la misma operación; conservará su clave y no duplicará las existencias.'
                      : p.status === 409
                        ? 'Las existencias cambiaron o la cantidad supera el saldo disponible. Actualiza el inventario y revisa el movimiento antes de confirmar.'
                        : p.message,
                    p.requestId,
                  ),
                  ...([401, 403].includes(p.status)
                    ? { row: null, ledger: null }
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
