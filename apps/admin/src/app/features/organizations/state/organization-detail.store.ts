import { inject, computed } from '@angular/core';
import {
  signalStore,
  withState,
  withMethods,
  withComputed,
  patchState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { EMPTY, pipe, tap, switchMap, exhaustMap } from 'rxjs';
import { ORGANIZATIONS_GATEWAY } from '../models/organizations-gateway';
import { ApiProblem, toApiProblem } from '../../../core/api';
import { missingProfile } from '../mappers/organizations.mapper';
import type {
  OrganizationProfile,
  OrganizationCommand,
  Page,
  Member,
  AuditEntry,
  AccountOption,
} from '../models/organization';
type ScopedPage = { organizationId: string; page: number };
const messages: Record<OrganizationCommand['kind'], string> = {
  archive: 'Organización archivada y anonimizada.',
  profile: 'Perfil actualizado.',
  submit: 'Solicitud enviada a revisión.',
  approve: 'Organización aprobada. Responsable y acceso asignados.',
  reject: 'Solicitud rechazada.',
  status: 'Estado operativo actualizado.',
  responsible: 'Responsable actualizado. La membresía anterior se conserva.',
};
export const OrganizationDetailStore = signalStore(
  withState({
    currentId: '',
    organization: null as OrganizationProfile | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    epoch: 0,
    success: '',
    members: null as Page<Member> | null,
    membersLoading: false,
    membersProblem: null as ApiProblem | null,
    audit: null as Page<AuditEntry> | null,
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
    accounts: null as Page<AccountOption> | null,
    accountsLoading: false,
    accountsProblem: null as ApiProblem | null,
  }),
  withComputed((store) => ({
    missing: computed(() => {
      const org = store.organization();
      return org ? missingProfile(org) : [];
    }),
  })),
  withMethods((store, gateway = inject(ORGANIZATIONS_GATEWAY)) => ({
    load: rxMethod<string>(
      pipe(
        tap((id) =>
          patchState(store, {
            loading: !!id,
            refreshRequired: false,
            epoch: store.epoch() + 1,
            problem: null,
            ...(id !== store.currentId()
              ? {
                  currentId: id,
                  organization: null,
                  members: null,
                  audit: null,
                  accounts: null,
                  success: '',
                  membersProblem: null,
                  auditProblem: null,
                  accountsProblem: null,
                }
              : {}),
          }),
        ),
        switchMap((id) =>
          !id
            ? EMPTY
            : gateway.get(id).pipe(
                tapResponse({
                  next: (organization) =>
                    patchState(store, { organization, loading: false }),
                  error: (error) =>
                    patchState(store, {
                      organization: null,
                      loading: false,
                      problem: toApiProblem(error),
                    }),
                }),
              ),
        ),
      ),
    ),
    loadMembers: rxMethod<ScopedPage>(
      pipe(
        tap(() =>
          patchState(store, {
            members: null,
            membersLoading: true,
            membersProblem: null,
          }),
        ),
        switchMap(({ organizationId, page }) =>
          gateway.members(organizationId, page).pipe(
            tapResponse({
              next: (members) => {
                if (organizationId === store.currentId())
                  patchState(store, { members, membersLoading: false });
              },
              error: (error) => {
                if (organizationId === store.currentId())
                  patchState(store, {
                    membersLoading: false,
                    membersProblem: toApiProblem(error),
                  });
              },
            }),
          ),
        ),
      ),
    ),
    loadAudit: rxMethod<ScopedPage>(
      pipe(
        tap(() =>
          patchState(store, {
            audit: null,
            auditLoading: true,
            auditProblem: null,
          }),
        ),
        switchMap(({ organizationId, page }) =>
          gateway.audit(organizationId, page).pipe(
            tapResponse({
              next: (audit) => {
                if (organizationId === store.currentId())
                  patchState(store, { audit, auditLoading: false });
              },
              error: (error) => {
                if (organizationId === store.currentId())
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
    findAccounts: rxMethod<{ search: string; page: number }>(
      pipe(
        tap(() =>
          patchState(store, {
            accounts: null,
            accountsLoading: true,
            accountsProblem: null,
          }),
        ),
        switchMap(({ search, page }) => {
          const id = store.currentId();
          return gateway.accounts(search, page).pipe(
            tapResponse({
              next: (accounts) => {
                if (id === store.currentId())
                  patchState(store, { accounts, accountsLoading: false });
              },
              error: (error) => {
                if (id === store.currentId())
                  patchState(store, {
                    accountsLoading: false,
                    accountsProblem: toApiProblem(error),
                  });
              },
            }),
          );
        }),
      ),
    ),
  })),
  withMethods((store, gateway = inject(ORGANIZATIONS_GATEWAY)) => ({
    execute: rxMethod<OrganizationCommand>(
      pipe(
        exhaustMap((command) => {
          if (
            store.refreshRequired() ||
            store.loading() ||
            !store.organization() ||
            command.organizationId !== store.currentId()
          )
            return EMPTY;
          const epoch = store.epoch();
          patchState(store, { busy: true, problem: null, success: '' });
          return gateway.execute(command).pipe(
            tapResponse({
              next: (organization) => {
                if (
                  epoch === store.epoch() &&
                  store.organization() &&
                  command.organizationId === store.currentId()
                )
                  patchState(store, {
                    organization,
                    success: messages[command.kind],
                  });
              },
              error: (error) => {
                if (
                  epoch !== store.epoch() ||
                  command.organizationId !== store.currentId()
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
                          'El cambio fue bloqueado: la versión, el estado o la cuenta responsable pueden haber cambiado. Actualiza los datos y revisa la decisión antes de confirmar.',
                          problem.requestId,
                        )
                      : problem,
                  ...([401, 403].includes(problem.status)
                    ? {
                        currentId: '',
                        organization: null,
                        members: null,
                        audit: null,
                        accounts: null,
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
