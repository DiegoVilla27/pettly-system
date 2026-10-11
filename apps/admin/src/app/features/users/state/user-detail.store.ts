import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { EMPTY, pipe, tap, switchMap, exhaustMap, forkJoin } from 'rxjs';
import { USERS_GATEWAY } from '../models/users-gateway';
import { AUTH_SESSION } from '../../../core/auth';
import { ApiProblem, toApiProblem } from '../../../core/api';
import type {
  User,
  UserAccess,
  UserCommand,
  AuditEntry,
  OrganizationOption,
  Page,
} from '../models/user';
const messages: Record<UserCommand['kind'], string> = {
  delete: 'Cuenta eliminada y anonimizada.',
  profile: 'Perfil actualizado.',
  status: 'Estado actualizado.',
  role: 'Rol global actualizado. La cuenta deberá iniciar sesión nuevamente.',
  resend: 'Invitación reenviada. El enlace anterior dejó de ser válido.',
  membership: 'Membresía guardada.',
  'remove-membership': 'Membresía retirada.',
};
export const UserDetailStore = signalStore(
  withState({
    currentUserId: '',
    user: null as User | null,
    access: null as UserAccess | null,
    loading: false,
    problem: null as ApiProblem | null,
    busy: false,
    refreshRequired: false,
    epoch: 0,
    success: '',
    audit: null as Page<AuditEntry> | null,
    auditLoading: false,
    auditProblem: null as ApiProblem | null,
    organizations: null as Page<OrganizationOption> | null,
    organizationsLoading: false,
    organizationsProblem: null as ApiProblem | null,
  }),
  withMethods((store, gateway = inject(USERS_GATEWAY)) => ({
    load: rxMethod<string>(
      pipe(
        tap((id) =>
          patchState(store, {
            loading: true,
            refreshRequired: false,
            epoch: store.epoch() + 1,
            problem: null,
            ...(id !== store.currentUserId()
              ? {
                  currentUserId: id,
                  user: null,
                  access: null,
                  success: '',
                  audit: null,
                  organizations: null,
                  organizationsProblem: null,
                }
              : {}),
          }),
        ),
        switchMap((id) =>
          forkJoin({ user: gateway.get(id), access: gateway.access(id) }).pipe(
            tapResponse({
              next: ({ user, access }) => {
                if (user.globalRole !== access.globalRole)
                  patchState(store, {
                    user: null,
                    access: null,
                    loading: false,
                    problem: new ApiProblem(
                      409,
                      'STALE_ACCESS',
                      'El acceso cambió mientras se cargaba. Actualiza la página.',
                    ),
                  });
                else patchState(store, { user, access, loading: false });
              },
              error: (error) =>
                patchState(store, {
                  user: null,
                  access: null,
                  loading: false,
                  problem: toApiProblem(error),
                }),
            }),
          ),
        ),
      ),
    ),
    loadAudit: rxMethod<{ userId: string; page: number }>(
      pipe(
        tap(() =>
          patchState(store, {
            audit: null,
            auditLoading: true,
            auditProblem: null,
          }),
        ),
        switchMap(({ userId, page }) =>
          gateway.audit(userId, page).pipe(
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
    findOrganizations: rxMethod<{ search: string; page: number }>(
      pipe(
        tap(() =>
          patchState(store, {
            organizations: null,
            organizationsLoading: true,
            organizationsProblem: null,
          }),
        ),
        switchMap(({ search, page }) =>
          gateway.organizations(search, page).pipe(
            tapResponse({
              next: (organizations) =>
                patchState(store, {
                  organizations,
                  organizationsLoading: false,
                }),
              error: (error) =>
                patchState(store, {
                  organizationsLoading: false,
                  organizationsProblem: toApiProblem(error),
                }),
            }),
          ),
        ),
      ),
    ),
  })),
  withMethods(
    (
      store,
      gateway = inject(USERS_GATEWAY),
      session = inject(AUTH_SESSION),
    ) => ({
      execute: rxMethod<UserCommand>(
        pipe(
          exhaustMap((command) => {
            if (
              store.refreshRequired() ||
              store.loading() ||
              !store.user() ||
              command.userId !== store.currentUserId()
            )
              return EMPTY;
            const epoch = store.epoch();
            patchState(store, { busy: true, problem: null, success: '' });
            return gateway.execute(command).pipe(
              tapResponse({
                next: () => {
                  if (epoch !== store.epoch() || !store.user()) return;
                  if (
                    command.userId === session.identity()?.id &&
                    (command.kind === 'delete' ||
                      command.kind === 'role' ||
                      (command.kind === 'status' &&
                        command.body.status === 'disabled'))
                  )
                    session.expire();
                  else if (command.userId === store.currentUserId()) {
                    patchState(store, { success: messages[command.kind] });
                    store.load(command.userId);
                  }
                },
                error: (error) => {
                  if (
                    epoch !== store.epoch() ||
                    command.userId !== store.currentUserId()
                  )
                    return;
                  const problem = toApiProblem(error);
                  const safe =
                    problem.status === 409
                      ? new ApiProblem(
                          409,
                          problem.code,
                          'El cambio fue bloqueado. Revisa el estado de la cuenta, su verificación y la protección del último administrador o responsable de organización.',
                          problem.requestId,
                        )
                      : problem;
                  patchState(store, {
                    problem: safe,
                    refreshRequired:
                      problem.status === 0 ||
                      problem.status === 409 ||
                      problem.status >= 500,
                    ...([401, 403].includes(problem.status)
                      ? {
                          currentUserId: '',
                          user: null,
                          access: null,
                          audit: null,
                          organizations: null,
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
    }),
  ),
);
