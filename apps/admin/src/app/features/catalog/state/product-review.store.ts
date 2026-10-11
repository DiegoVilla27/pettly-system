import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { CATALOG_GATEWAY } from '../models/catalog-gateway';
import type {
  ProductDetail,
  ProductReview,
  Product,
  PhotoPreview,
} from '../models/catalog';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const ProductReviewStore = signalStore(
  withState({
    currentId: '',
    epoch: 0,
    refreshRequired: false,
    detail: null as ProductDetail | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    decision: null as Product | null,
    photo: null as PhotoPreview | null,
    photoId: '',
    photoLoading: false,
    photoProblem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(CATALOG_GATEWAY)) => ({
    load: rxMethod<string>(
      pipe(
        tap((id) =>
          patchState(store, {
            currentId: id,
            epoch: store.epoch() + 1,
            refreshRequired: false,
            detail: null,
            loading: true,
            problem: null,
            decision: null,
            photo: null,
            photoId: '',
            photoProblem: null,
            photoLoading: false,
          }),
        ),
        switchMap((id) =>
          gateway.preview(id).pipe(
            tapResponse({
              next: (detail) => patchState(store, { detail, loading: false }),
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
    openPhoto: rxMethod<string>(
      pipe(
        tap((mediaId) =>
          patchState(store, {
            photoId: mediaId,
            photo: null,
            photoLoading: true,
            photoProblem: null,
          }),
        ),
        switchMap((mediaId) => {
          const detail = store.detail();
          if (!detail?.photos.some((p) => p.mediaId === mediaId)) {
            patchState(store, {
              photoLoading: false,
              photoProblem: new ApiProblem(
                400,
                'INVALID_INPUT',
                'Selecciona una fotografía del producto.',
              ),
            });
            return EMPTY;
          }
          return gateway.photo(detail.product.id, mediaId).pipe(
            tapResponse({
              next: (blob) => {
                if (
                  store.detail() &&
                  detail.product.id === store.currentId() &&
                  mediaId === store.photoId()
                )
                  patchState(store, {
                    photo: { productId: detail.product.id, mediaId, blob },
                    photoLoading: false,
                  });
              },
              error: (error) => {
                if (
                  store.detail() &&
                  detail.product.id === store.currentId() &&
                  mediaId === store.photoId()
                )
                  patchState(store, {
                    photoLoading: false,
                    photoProblem: toApiProblem(error),
                  });
              },
            }),
          );
        }),
      ),
    ),
    closePhoto() {
      patchState(store, {
        photo: null,
        photoId: '',
        photoLoading: false,
        photoProblem: null,
      });
    },
    review: rxMethod<{ id: string; body: ProductReview }>(
      pipe(
        exhaustMap(({ id, body }) => {
          if (
            store.loading() ||
            store.refreshRequired() ||
            !store.detail() ||
            id !== store.currentId()
          )
            return EMPTY;
          const epoch = store.epoch();
          patchState(store, {
            busy: true,
            problem: null,
            photo: null,
            photoId: '',
          });
          return gateway.review(id, body).pipe(
            tapResponse({
              next: (decision) => {
                if (
                  epoch === store.epoch() &&
                  store.detail() &&
                  id === store.currentId()
                )
                  patchState(store, { decision, detail: null });
              },
              error: (error) => {
                if (epoch !== store.epoch() || id !== store.currentId()) return;
                const p = toApiProblem(error);
                patchState(store, {
                  refreshRequired:
                    p.status === 0 || p.status === 409 || p.status >= 500,
                  problem:
                    p.status === 409
                      ? new ApiProblem(
                          409,
                          p.code,
                          'El producto cambió o ya no cumple los requisitos. Actualiza los datos antes de confirmar otra decisión.',
                          p.requestId,
                        )
                      : p,
                  ...([401, 403].includes(p.status)
                    ? { currentId: '', detail: null, photo: null, photoId: '' }
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
