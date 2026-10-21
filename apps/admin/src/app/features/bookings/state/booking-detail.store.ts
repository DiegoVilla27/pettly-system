import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { BOOKINGS_GATEWAY } from '../models/bookings-gateway';
import type {
  Booking,
  BookingContext,
  BookingCommand,
  BookingAudit,
} from '../models/booking';
import { toApiProblem, ApiProblem } from '../../../core/api';
export const BookingDetailStore = signalStore(
  withState({
    context: null as BookingContext | null,
    booking: null as Booking | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    success: null as Booking | null,
    audits: [] as BookingAudit[],
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
    auditTotal: 0,
  }),
  withMethods((store, gateway = inject(BOOKINGS_GATEWAY)) => ({
    load: rxMethod<BookingContext | null>(
      pipe(
        tap((context) =>
          patchState(store, {
            context,
            booking: null,
            loading: !!context,
            problem: null,
            success: null,
            refreshRequired: false,
          }),
        ),
        switchMap((c) =>
          c
            ? gateway.get(c).pipe(
                tapResponse({
                  next: (booking) =>
                    patchState(store, { booking, loading: false }),
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
      context: BookingContext;
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
    execute: rxMethod<BookingCommand>(
      pipe(
        exhaustMap((c) => {
          if (store.refreshRequired()) return EMPTY;
          const context = store.context();
          if (
            !context ||
            context.bookingId !== c.context.bookingId ||
            context.organizationId !== c.context.organizationId
          )
            return EMPTY;
          patchState(store, { busy: true, problem: null, success: null });
          return gateway.execute(c).pipe(
            tapResponse({
              next: (b) => {
                if (context === store.context())
                  patchState(store, { booking: b, success: b });
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
                        'El resultado es incierto. Actualiza la reserva y revisa el historial antes de repetir una acción.',
                        p.requestId,
                      )
                    : p,
                  ...([401, 403, 404].includes(p.status)
                    ? { booking: null }
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
