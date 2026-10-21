import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import {
  pipe,
  tap,
  switchMap,
  exhaustMap,
  EMPTY,
  forkJoin,
  of,
  catchError,
} from 'rxjs';
import { PAYMENTS_GATEWAY } from '../models/payments-gateway';
import type {
  Payment,
  PaymentContext,
  PaymentHistory,
  PaymentPolicy,
  FinancialEvidence,
} from '../models/payment';
import { toApiProblem, ApiProblem } from '../../../core/api';
const privateState = {
  payment: null as Payment | null,
  history: null as PaymentHistory | null,
  evidence: null as FinancialEvidence | null,
  policy: null as PaymentPolicy | null,
};
export const PaymentDetailStore = signalStore(
  withState({
    ...privateState,
    context: null as PaymentContext | null,
    loading: false,
    problem: null as ApiProblem | null,
    policyProblem: null as ApiProblem | null,
    historyLoading: false,
    historyProblem: null as ApiProblem | null,
    evidenceLoading: false,
    evidenceProblem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    requested: false,
  }),
  withMethods((store, gateway = inject(PAYMENTS_GATEWAY)) => ({
    load: rxMethod<PaymentContext | null>(
      pipe(
        tap((context) =>
          patchState(store, {
            ...privateState,
            context,
            loading: !!context,
            problem: null,
            policyProblem: null,
            historyProblem: null,
            evidenceProblem: null,
            requested: false,
            refreshRequired: false,
          }),
        ),
        switchMap((c) =>
          c
            ? forkJoin({
                payment: gateway.get(c),
                policy: gateway.policy().pipe(
                  catchError((e) => {
                    const p = toApiProblem(e);
                    if ([401, 403, 404].includes(p.status)) throw p;
                    patchState(store, { policyProblem: p });
                    return of(null);
                  }),
                ),
              }).pipe(
                tapResponse({
                  next: (r) => patchState(store, { ...r, loading: false }),
                  error: (e) =>
                    patchState(store, {
                      ...privateState,
                      loading: false,
                      problem: toApiProblem(e),
                    }),
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    loadHistory: rxMethod<{
      context: PaymentContext;
      page: number;
      version: number;
    } | null>(
      pipe(
        tap((q) =>
          patchState(store, {
            history: null,
            historyProblem: null,
            historyLoading: !!q,
          }),
        ),
        switchMap((q) =>
          q
            ? gateway.history(q.context, q.page).pipe(
                tapResponse({
                  next: (history) => {
                    if (store.payment() && store.context() === q.context)
                      patchState(store, { history, historyLoading: false });
                  },
                  error: (e) => {
                    const p = toApiProblem(e);
                    patchState(store, {
                      historyLoading: false,
                      historyProblem: p,
                      ...([401, 403, 404].includes(p.status)
                        ? privateState
                        : {}),
                    });
                  },
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    loadEvidence: rxMethod<PaymentContext | null>(
      pipe(
        tap((c) =>
          patchState(store, {
            evidence: null,
            evidenceProblem: null,
            evidenceLoading: !!c,
          }),
        ),
        switchMap((c) =>
          c
            ? gateway.financials(c).pipe(
                tapResponse({
                  next: (evidence) => {
                    if (store.payment() && store.context() === c)
                      patchState(store, { evidence, evidenceLoading: false });
                  },
                  error: (e) => {
                    const p = toApiProblem(e);
                    patchState(store, {
                      evidenceLoading: false,
                      evidenceProblem: p,
                      ...([401, 403, 404].includes(p.status)
                        ? privateState
                        : {}),
                    });
                  },
                }),
              )
            : EMPTY,
        ),
      ),
    ),
    reconcile: rxMethod<PaymentContext>(
      pipe(
        exhaustMap((c) => {
          const context = store.context(),
            p = store.payment(),
            policy = store.policy();
          if (
            !context ||
            context !== c ||
            !p ||
            store.loading() ||
            store.refreshRequired() ||
            !policy?.providerEnabled ||
            policy.provider !== p.provider
          )
            return EMPTY;
          patchState(store, { busy: true, problem: null, requested: false });
          return gateway.reconcile(c).pipe(
            tapResponse({
              next: (payment) => {
                if (context === store.context())
                  patchState(store, {
                    payment,
                    requested: true,
                    refreshRequired: true,
                  });
              },
              error: (e) => {
                if (context !== store.context()) return;
                const p = toApiProblem(e),
                  uncertain = p.status === 0 || p.status >= 500;
                patchState(store, {
                  refreshRequired: uncertain || p.status === 409,
                  problem: uncertain
                    ? new ApiProblem(
                        p.status,
                        p.code,
                        'No podemos confirmar el resultado. Actualiza el pago y revisa el historial antes de solicitar otra consulta.',
                        p.requestId,
                      )
                    : p,
                  ...([401, 403, 404].includes(p.status) ? privateState : {}),
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
