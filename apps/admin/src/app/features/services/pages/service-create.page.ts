import { signal as pickerSignal } from '@angular/core';
import { rxResource as pickerResource } from '@angular/core/rxjs-interop';
import { SERVICES_GATEWAY } from '../models/services-gateway';
import { toApiProblem } from '../../../core/api';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ServiceEditorComponent } from '../components/service-editor.component';
import { ServiceDetailStore } from '../state/service-detail.store';
import type { ServiceProfile } from '../models/service';
import { ProblemComponent } from '../../../shared/ui/problem.component';
@Component({
  selector: 'app-service-create',
  imports: [RouterLink, ServiceEditorComponent, ProblemComponent],
  providers: [ServiceDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/servicios"
      [queryParams]="{ organizationId: organizationId() }"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
      >← Volver a servicios</a
    >
    <h1 class="mt-3 text-3xl font-semibold tracking-tight">
      Una nueva forma de cuidar.
    </h1>
    <p class="mt-4 text-sm text-muted">
      Crea un servicio para esta empresa. Será un borrador hasta su revisión
      independiente.
    </p>
    <app-problem [problem]="store.problem()" /><app-problem
      [problem]="store.resourcesProblem()"
    />
    @if (store.refreshRequired()) {
      <p role="status" class="mt-5 rounded-xl bg-sage p-4 text-sm">
        El resultado es incierto. Vuelve al listado y comprueba si el servicio
        se creó antes de iniciar otro.
      </p>
    }
    @if (store.resourcesLoading()) {
      <p role="status" class="mt-5 text-sm text-muted">Consultando recursos…</p>
    } @else if (!store.resourcesProblem()) {
      @if (professionals.error()) {
        <app-problem [problem]="toProblem(professionals.error())" />
      }
      <app-service-editor
        [resources]="store.resources()"
        [professionals]="professionals.value() ?? null"
        [professionalBusy]="professionals.isLoading()"
        (professionalPageChanged)="professionalPage.set($event)"
        [blocked]="store.busy() || store.refreshRequired()"
        (submitted)="create($event)"
      />
    }`,
})
export class ServiceCreatePage {
  readonly store = inject(ServiceDetailStore);
  private readonly pickerGateway = inject(SERVICES_GATEWAY);
  readonly professionalPage = pickerSignal(1);
  readonly toProblem = toApiProblem;
  readonly professionals = pickerResource({
    params: () => {
      const organizationId = this.organizationId();
      return organizationId
        ? { organizationId, page: this.professionalPage() }
        : undefined;
    },
    stream: ({ params }) =>
      this.pickerGateway.eligible(params.organizationId, params.page),
  });

  private readonly router = inject(Router);
  readonly organizationId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('organizationId') ?? ''),
    ),
    { initialValue: '' },
  );
  readonly resourceRequest = computed(() => this.organizationId() || null);
  constructor() {
    this.store.loadResources(this.resourceRequest);
    effect(() => {
      const s = this.store.success();
      if (s)
        void this.router.navigate(['/servicios', s.organizationId, s.id], {
          replaceUrl: true,
        });
    });
  }
  create(value: { profile: ServiceProfile; reason: string }) {
    if (!this.store.busy() && !this.store.refreshRequired())
      this.store.execute({
        kind: 'create',
        body: { organizationId: this.organizationId(), ...value },
      });
  }
}
