import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AUTH_SESSION } from '../../../core/auth';
import { ORGANIZATIONS_GATEWAY } from '../models/organizations-gateway';
import { OrganizationDetailStore } from '../state/organization-detail.store';
import { OrganizationEditorComponent } from '../components/organization-editor.component';
import { DecisionActionComponent } from '../components/decision-action.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { toApiProblem, ApiProblem } from '../../../core/api';
@Component({
  selector: 'app-my-organization-detail',
  imports: [
    RouterLink,
    OrganizationEditorComponent,
    DecisionActionComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [OrganizationDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/organizaciones/mis-equipos"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
      >← Mis organizaciones</a
    >
    <h1 class="mt-3 text-3xl font-semibold">
      {{ basic.value()?.name ?? 'Mi organización' }}
    </h1>
    @if (basic.error()) {
      <app-problem [problem]="toProblem(basic.error())" />
    }
    @if (basic.value(); as o) {
      <p class="mt-3 text-sm text-muted">
        {{ o.typeLabel }} · {{ o.statusLabel }}
      </p>
      @if (canManage()) {
        <app-problem [problem]="store.problem()" />
        @if (store.success()) {
          <p role="status" class="mt-4 rounded-xl bg-sage p-4 text-sm">
            {{ store.success() }}
          </p>
        }
        <button
          type="button"
          (click)="refresh()"
          [disabled]="store.busy() || store.loading()"
          class="mt-5 min-h-11 rounded-xl border border-line px-4"
        >
          Actualizar mi organización
        </button>
        @if (store.refreshRequired()) {
          <p role="status" class="mt-4 text-sm">
            Actualiza y revisa el historial antes de repetir un cambio.
          </p>
        }
        @if (store.organization(); as profile) {
          @if (profile.status !== 'pending' && profile.status !== 'deleted') {
            <section class="mt-6 rounded-2xl border border-line bg-white p-5">
              <app-organization-editor
                [organization]="profile"
                [busy]="store.busy() || store.refreshRequired()"
                (update)="
                  store.execute({
                    kind: 'profile',
                    organizationId: profile.id,
                    body: $event,
                  })
                "
              />
            </section>
          }
          @if (profile.status === 'draft' || profile.status === 'rejected') {
            <div class="mt-6">
              <app-organization-decision
                id="own-organization-submit"
                title="Enviar mi organización a revisión"
                description="Completa el perfil para que el superadministrador decida su habilitación."
                buttonLabel="Enviar mi organización"
                reasonLabel="Motivo de envío de mi organización"
                [context]="profile.id + ':' + profile.version"
                [busy]="store.busy() || store.refreshRequired()"
                (confirmed)="
                  store.execute({
                    kind: 'submit',
                    organizationId: profile.id,
                    body: { reason: $event, expectedVersion: profile.version },
                  })
                "
              />
            </div>
          }
        }
        <section class="mt-6 rounded-2xl border border-line bg-white p-5">
          <h2 class="text-lg font-semibold">Equipo de mi organización</h2>
          <p class="mt-2 text-sm text-muted">
            La asignación de roles pertenece al superadministrador.
          </p>
          @if (members.isLoading()) {
            <p role="status" class="mt-3 text-sm text-muted">
              Consultando equipo…
            </p>
          }
          @if (members.error()) {
            <app-problem [problem]="toProblem(members.error())" />
          }
          @if (members.value(); as result) {
            <ul class="mt-4 space-y-3">
              @for (m of result.items; track m.id) {
                <li class="text-sm break-all">
                  {{
                    m.role === 'business_admin' || m.role === 'adoption_admin'
                      ? 'Administrador'
                      : 'Operador'
                  }}
                  · Cuenta {{ m.userId }}
                </li>
              }
            </ul>
            <app-pagination
              [page]="result.page"
              [total]="result.total"
              [limit]="result.limit"
              (pageChange)="memberPage.set($event)"
            />
          }
        </section>
        <section class="mt-6 rounded-2xl border border-line bg-white p-5">
          <h2 class="text-lg font-semibold">Historial de mi organización</h2>
          @if (audit.isLoading()) {
            <p role="status" class="mt-3 text-sm text-muted">
              Consultando historial…
            </p>
          }
          @if (audit.error()) {
            <app-problem [problem]="toProblem(audit.error())" />
          }
          @if (audit.value(); as result) {
            <ol
              aria-label="Historial de mi organización"
              class="mt-4 space-y-3"
            >
              @for (e of result.items; track e.id) {
                <li class="rounded-xl border border-line p-3">
                  <p class="text-sm">{{ e.reason }}</p>
                  <p class="mt-2 text-xs break-all">
                    {{ e.createdAt }} · Cuenta {{ e.actorId }}
                  </p>
                </li>
              }
            </ol>
            <app-pagination
              [page]="result.page"
              [total]="result.total"
              [limit]="result.limit"
              (pageChange)="auditPage.set($event)"
            />
          }
        </section>
      } @else {
        <p class="mt-5 text-sm">
          El administrador de esta organización mantiene el perfil y consulta su
          equipo e historial. Tu rol conserva el acceso a las operaciones
          habilitadas.
        </p>
      }
    }`,
})
export class MyOrganizationDetailPage {
  readonly store = inject(OrganizationDetailStore);
  private readonly session = inject(AUTH_SESSION);
  private readonly gateway = inject(ORGANIZATIONS_GATEWAY);
  readonly toProblem = toApiProblem;
  readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('organizationId') ?? ''),
    ),
    { initialValue: '' },
  );
  readonly memberPage = signal(1);
  readonly auditPage = signal(1);
  readonly membership = computed(() =>
    this.session
      .identity()
      ?.organizations.find((o) => o.organizationId === this.id()),
  );
  readonly canManage = computed(
    () =>
      this.session.identity()?.role === 'super_admin' ||
      ['business_admin', 'adoption_admin'].includes(
        this.membership()?.role ?? '',
      ),
  );
  readonly basic = rxResource({
    params: () => this.id() || undefined,
    stream: ({ params }) => {
      if (this.session.identity()?.role !== 'super_admin' && !this.membership())
        throw new ApiProblem(
          403,
          'FORBIDDEN',
          'Selecciona una de tus organizaciones.',
        );
      return this.gateway.basic(params);
    },
  });
  readonly managedId = computed(() =>
    this.canManage() && this.basic.hasValue() ? this.id() : undefined,
  );
  readonly members = rxResource({
    params: () =>
      this.managedId()
        ? { id: this.managedId() as string, page: this.memberPage() }
        : undefined,
    stream: ({ params }) => this.gateway.members(params.id, params.page),
  });
  readonly audit = rxResource({
    params: () =>
      this.managedId()
        ? {
            id: this.managedId() as string,
            page: this.auditPage(),
            version: this.store.organization()?.version,
          }
        : undefined,
    stream: ({ params }) => this.gateway.audit(params.id, params.page),
  });
  constructor() {
    this.store.load(computed(() => this.managedId() ?? ''));
  }
  refresh() {
    this.store.load(this.id());
    this.basic.reload();
    this.members.reload();
    this.audit.reload();
  }
}
