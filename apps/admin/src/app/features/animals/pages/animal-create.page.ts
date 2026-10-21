import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AnimalCreateStore } from '../state/animal-create.store';
import { ANIMALS_GATEWAY } from '../models/animals-gateway';
import { AnimalFormComponent } from '../components/animal-form.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { ApiProblem, toApiProblem } from '../../../core/api';
import type { AnimalProfile } from '../models/animal';
@Component({
  selector: 'app-animal-create',
  imports: [RouterLink, AnimalFormComponent, ProblemComponent],
  providers: [AnimalCreateStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/animales"
      [queryParams]="{ organizationId: organizationId() }"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
      >← Volver a animales</a
    >
    <h1 class="mt-3 text-3xl font-semibold tracking-tight">
      Registrar un animal
    </h1>
    <p class="mt-3 text-sm text-muted">
      El registro pertenece al refugio seleccionado. No se publica hasta
      completar su recorrido de adopción.
    </p>
    <app-problem [problem]="store.problem()" />
    @if (shelter.isLoading()) {
      <p role="status" class="mt-5 text-sm">Consultando refugio…</p>
    }
    @if (shelter.error()) {
      <app-problem [problem]="toProblem(shelter.error())" />
    }
    @if (shelter.value(); as s) {
      <section class="mt-6 rounded-2xl border border-line bg-white p-5">
        <p class="font-semibold">{{ s.name }}</p>
        <p class="mt-1 text-xs break-all text-muted">{{ s.id }}</p>
        @if (store.uncertain()) {
          <p role="status" class="mt-4 text-sm">
            Consulta el listado antes de intentar otra creación. No hay
            reintento automático.
          </p>
        }
        <app-animal-form
          [busy]="store.busy()"
          [blocked]="store.uncertain() || !!store.created()"
          (submitted)="create($event)"
        />
      </section>
    }`,
})
export class AnimalCreatePage {
  readonly store = inject(AnimalCreateStore);
  private readonly router = inject(Router);
  private readonly gateway = inject(ANIMALS_GATEWAY);
  readonly toProblem = toApiProblem;
  readonly organizationId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('organizationId') ?? ''),
    ),
    { initialValue: '' },
  );
  readonly shelter = rxResource({
    params: () => this.organizationId(),
    stream: ({ params }) =>
      this.gateway.shelters('', params).pipe(
        map((items) => {
          const s = items.find((i) => i.id === params);
          if (!s)
            throw new ApiProblem(
              403,
              'FORBIDDEN',
              'Selecciona un refugio activo y autorizado.',
            );
          return s;
        }),
      ),
  });
  constructor() {
    effect(() => {
      const a = this.store.created();
      if (a && a.organizationId === this.organizationId())
        void this.router.navigate(['/animales', a.organizationId, a.id], {
          replaceUrl: true,
        });
    });
  }
  create(v: { profile: AnimalProfile; reason: string }) {
    if (
      !this.store.busy() &&
      !this.store.uncertain() &&
      this.shelter.value()?.id === this.organizationId()
    )
      this.store.create({ organizationId: this.organizationId(), ...v });
  }
}
