import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { VETERINARY_GATEWAY } from '../models/veterinary-gateway';
import {
  documentKinds,
  type Credential,
  type CredentialCommand,
  type CredentialAudit,
  type Page,
  type Evidence,
} from '../models/credential';
import { ApiProblem, toApiProblem } from '../../../core/api';
export const CredentialDetailStore = signalStore(
  withState({
    currentId: '',
    epoch: 0,
    refreshRequired: false,
    credential: null as Credential | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    success: '',
    audit: null as Page<CredentialAudit> | null,
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
    evidence: null as Evidence | null,
    evidenceLoading: false,
    evidenceProblem: null as ApiProblem | null,
    evidenceMediaId: '',
  }),
  withMethods((store, gateway = inject(VETERINARY_GATEWAY)) => ({
    load: rxMethod<string>(
      pipe(
        tap((id) =>
          patchState(store, {
            currentId: id,
            epoch: store.epoch() + 1,
            refreshRequired: false,
            credential: null,
            loading: true,
            problem: null,
            success: '',
            evidence: null,
            evidenceMediaId: '',
            evidenceProblem: null,
            audit: null,
          }),
        ),
        switchMap((id) =>
          gateway.get(id).pipe(
            tapResponse({
              next: (credential) =>
                patchState(store, { credential, loading: false }),
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
    auditLoad: rxMethod<{ credentialId: string; page: number }>(
      pipe(
        tap(() =>
          patchState(store, {
            audit: null,
            auditLoading: true,
            auditProblem: null,
          }),
        ),
        switchMap(({ credentialId, page }) =>
          gateway.audit(credentialId, page).pipe(
            tapResponse({
              next: (audit) => {
                if (credentialId === store.currentId())
                  patchState(store, { audit, auditLoading: false });
              },
              error: (error) => {
                if (credentialId === store.currentId())
                  patchState(store, {
                    auditLoading: false,
                    auditProblem: toApiProblem(error),
                  });
              },
            }),
          ),
        ),
      ),
    ),
    openEvidence: rxMethod<string>(
      pipe(
        tap((mediaId) =>
          patchState(store, {
            evidence: null,
            evidenceMediaId: mediaId,
            evidenceLoading: true,
            evidenceProblem: null,
          }),
        ),
        switchMap((mediaId) => {
          const credential = store.credential();
          const document = credential?.documents.find(
            (d) => d.mediaId === mediaId,
          );
          if (!credential || !document) {
            patchState(store, {
              evidenceLoading: false,
              evidenceProblem: new ApiProblem(
                400,
                'INVALID_INPUT',
                'Selecciona una evidencia de esta acreditación.',
              ),
            });
            return [];
          }
          return gateway.evidence(credential.id, mediaId).pipe(
            tapResponse({
              next: (blob) => {
                if (
                  store.credential() &&
                  credential.id === store.currentId() &&
                  mediaId === store.evidenceMediaId()
                )
                  patchState(store, {
                    evidence: {
                      credentialId: credential.id,
                      mediaId,
                      blob,
                      kindLabel:
                        documentKinds.find((k) => k.value === document.kind)
                          ?.label ?? document.kind,
                    },
                    evidenceLoading: false,
                  });
              },
              error: (error) => {
                if (
                  store.credential() &&
                  credential.id === store.currentId() &&
                  mediaId === store.evidenceMediaId()
                )
                  patchState(store, {
                    evidenceLoading: false,
                    evidenceProblem: toApiProblem(error),
                  });
              },
            }),
          );
        }),
      ),
    ),
    closeEvidence() {
      patchState(store, {
        evidence: null,
        evidenceMediaId: '',
        evidenceLoading: false,
        evidenceProblem: null,
      });
    },
    execute: rxMethod<CredentialCommand>(
      pipe(
        exhaustMap((command) => {
          if (
            store.loading() ||
            store.refreshRequired() ||
            !store.credential() ||
            command.credentialId !== store.currentId()
          )
            return EMPTY;
          const epoch = store.epoch();
          patchState(store, {
            busy: true,
            problem: null,
            success: '',
            evidence: null,
            evidenceMediaId: '',
          });
          return gateway.execute(command).pipe(
            tapResponse({
              next: (credential) => {
                if (
                  epoch === store.epoch() &&
                  store.credential() &&
                  command.credentialId === store.currentId()
                )
                  patchState(store, {
                    credential,
                    success:
                      command.kind === 'revoke'
                        ? 'Acreditación revocada.'
                        : 'Decisión de revisión registrada.',
                  });
              },
              error: (error) => {
                if (
                  epoch !== store.epoch() ||
                  command.credentialId !== store.currentId()
                )
                  return;
                const problem = toApiProblem(error);
                patchState(store, {
                  refreshRequired:
                    problem.status === 0 ||
                    problem.status === 409 ||
                    problem.status >= 500,
                  problem:
                    problem.status === 409
                      ? new ApiProblem(
                          409,
                          problem.code,
                          'La acreditación cambió o ya no cumple los requisitos. Actualiza los datos y revisa la decisión antes de confirmar.',
                          problem.requestId,
                        )
                      : problem,
                  ...([401, 403].includes(problem.status)
                    ? {
                        currentId: '',
                        credential: null,
                        evidence: null,
                        audit: null,
                      }
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
