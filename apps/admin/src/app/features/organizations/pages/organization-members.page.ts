import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { OrganizationDetailStore } from '../state/organization-detail.store';
import { OrganizationHeadingComponent } from '../components/organization-heading.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-organization-members',
  imports: [
    DatePipe,
    RouterLink,
    OrganizationHeadingComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [OrganizationDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-problem [problem]="store.problem()" />
    @if (store.loading()) {
      <p role="status" class="py-8 text-muted">Cargando organización…</p>
    } @else if (store.organization(); as org) {
      <app-organization-heading [organization]="org" />
      <section class="mt-7" aria-labelledby="organization-members">
        <h2 id="organization-members" class="text-xl font-semibold">
          Miembros y acceso
        </h2>
        <p class="mt-3 text-sm leading-relaxed text-muted">
          Cada rol pertenece únicamente a esta organización. Los permisos
          operativos requieren que la organización esté activa y la cuenta siga
          habilitada. Asigna o retira membresías desde el acceso del usuario.
        </p>
        <div class="mt-5">
          <app-problem [problem]="store.membersProblem()" />
        </div>
        @if (store.membersLoading()) {
          <p role="status" class="mt-6 text-sm text-muted">
            Cargando miembros…
          </p>
        } @else if (store.members(); as members) {
          <ul class="mt-6 space-y-4" aria-label="Miembros de la organización">
            @for (member of members.items; track member.id) {
              <li class="rounded-2xl border border-line bg-white p-5">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="min-w-0">
                    <h3 class="font-semibold">{{ roleLabel(member.role) }}</h3>
                    <p class="mt-3 text-xs break-all text-muted">
                      Cuenta: {{ member.userId }}
                    </p>
                    @if (member.userId === org.responsibleUserId) {
                      <p class="mt-3 text-xs font-semibold text-primary">
                        Responsable de la organización
                      </p>
                    }
                  </div>
                  <a
                    [routerLink]="['/usuarios', member.userId, 'acceso']"
                    [attr.aria-label]="'Gestionar acceso de ' + member.userId"
                    class="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-medium"
                    >Gestionar acceso</a
                  >
                </div>
                <p class="mt-4 text-xs text-muted">
                  Asignado {{ member.createdAt | date: 'dd/MM/yyyy HH:mm' }} ·
                  Actualizado {{ member.updatedAt | date: 'dd/MM/yyyy HH:mm' }}
                </p>
              </li>
            } @empty {
              <li
                class="rounded-2xl border border-line bg-white p-6 text-sm text-muted"
              >
                No hay miembros asignados.
              </li>
            }
          </ul>
          <app-pagination
            [page]="members.page"
            [total]="members.total"
            [limit]="members.limit"
            (pageChange)="page($event)"
          />
        } @else if (store.membersProblem()) {
          <button
            type="button"
            (click)="store.loadMembers(request())"
            class="mt-4 min-h-11 rounded-xl border border-line px-4"
          >
            Reintentar miembros
          </button>
        }
      </section>
    } @else {
      <h1 class="text-2xl font-semibold">No pudimos cargar los miembros</h1>
      <a
        routerLink="/organizaciones"
        class="mt-4 inline-flex min-h-11 items-center text-primary"
        >Volver a organizaciones</a
      >
    }`,
})
export class OrganizationMembersPage {
  readonly store = inject(OrganizationDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('organizationId') ?? '')),
    { initialValue: '' },
  );
  readonly request = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      map(([identity, params]) => {
        const page = Number(params.get('page'));
        return {
          organizationId: identity.get('organizationId') ?? '',
          page:
            Number.isSafeInteger(page) && page >= 1 && page <= 100000
              ? page
              : 1,
        };
      }),
    ),
    { initialValue: { organizationId: '', page: 1 } },
  );
  constructor() {
    this.store.load(this.id);
    this.store.loadMembers(this.request);
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
  roleLabel(role: string) {
    return (
      (
        {
          business_admin: 'Administrador de empresa',
          business_operator: 'Operador de empresa',
          adoption_admin: 'Administrador de refugio',
          adoption_operator: 'Operador de refugio',
        } as Record<string, string>
      )[role] ?? role
    );
  }
}
