import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { OrganizationDetailStore } from '../state/organization-detail.store';
import { OrganizationHeadingComponent } from '../components/organization-heading.component';
import { OrganizationEditorComponent } from '../components/organization-editor.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
@Component({
  selector: 'app-organization-edit',
  imports: [
    RouterLink,
    OrganizationHeadingComponent,
    OrganizationEditorComponent,
    ProblemComponent,
  ],
  providers: [OrganizationDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-problem [problem]="store.problem()" />
    @if (store.success()) {
      <p role="status" class="mb-5 rounded-xl bg-sage p-4 text-sm text-primary">
        {{ store.success() }}
      </p>
    }
    @if (store.problem()?.status === 409) {
      <button
        type="button"
        (click)="store.load(organizationId())"
        class="mt-4 mb-5 min-h-11 rounded-xl border border-line px-4"
      >
        Actualizar datos
      </button>
    }
    @if (store.loading()) {
      <p role="status" class="py-8 text-muted">Cargando perfil…</p>
    } @else if (store.organization(); as org) {
      <app-organization-heading [organization]="org" />
      @if (org.status !== 'deleted') {
        <section
          class="mt-7 rounded-3xl border border-line bg-white p-6 sm:p-8"
        >
          <h2 class="mb-7 text-xl font-semibold">Editar perfil</h2>
          <app-organization-editor
            [organization]="org"
            [busy]="store.busy() || store.refreshRequired()"
            (update)="
              store.execute({
                kind: 'profile',
                organizationId: org.id,
                body: $event,
              })
            "
          />
        </section>
      } @else {
        <p class="mt-7 text-muted">
          Las organizaciones archivadas no se pueden editar.
        </p>
      }
    } @else {
      <h1 class="text-2xl font-semibold">No pudimos cargar el perfil</h1>
      <a
        routerLink="/organizaciones"
        class="mt-4 inline-flex min-h-11 items-center text-primary"
        >Volver a organizaciones</a
      >
    }`,
})
export class OrganizationEditPage {
  readonly store = inject(OrganizationDetailStore);
  readonly organizationId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('organizationId') ?? ''),
    ),
    { initialValue: '' },
  );
  constructor() {
    this.store.load(this.organizationId);
  }
}
