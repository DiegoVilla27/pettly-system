import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, debounceTime, distinctUntilChanged } from 'rxjs';
import { ResourceDirectoryStore } from '../state/resource-directory.store';
import { ServicesListStore } from '../state/services-list.store';
import { ProblemComponent } from '../../../shared/ui/problem.component';
@Component({
  selector: 'app-resources-list',
  imports: [RouterLink, ReactiveFormsModule, ProblemComponent],
  providers: [ResourceDirectoryStore, ServicesListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      routerLink="/servicios"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
      >← Volver a servicios</a
    >
    <header class="mt-3">
      <p class="text-xs font-semibold text-primary">Agendas y capacidad</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">
        Un lugar para cada cuidado.
      </h1>
      <p class="mt-4 text-sm text-muted">
        Gestiona los recursos de una empresa y sus horarios semanales en hora de
        Colombia.
      </p>
    </header>
    <form
      [formGroup]="form"
      (ngSubmit)="choose()"
      class="mt-6 grid gap-4 rounded-3xl border border-line bg-white p-5 sm:grid-cols-2"
    >
      <label class="text-sm font-semibold"
        >Buscar empresa<input
          formControlName="search"
          type="search"
          maxlength="100"
          class="mt-2 block min-h-11 w-full rounded-xl border border-line px-3"
      /></label>
      <div>
        <label for="resource-company" class="text-sm font-semibold"
          >Empresa</label
        ><select
          id="resource-company"
          formControlName="organizationId"
          class="mt-2 block min-h-11 w-full rounded-xl border border-line px-3"
        >
          <option value="">Selecciona una empresa</option>
          @for (c of companies.companies(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
      </div>
      <button
        type="submit"
        [disabled]="companies.companiesLoading()"
        class="min-h-11 rounded-xl bg-primary px-4 font-semibold text-white disabled:opacity-50"
      >
        Consultar recursos
      </button>
    </form>
    <app-problem [problem]="companies.companiesProblem()" /><app-problem
      [problem]="store.problem()"
    />
    @if (organizationId()) {
      <a
        [routerLink]="['/servicios', organizationId(), 'recursos', 'nuevo']"
        class="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white"
        >Crear recurso</a
      >
    }
    @if (store.loading()) {
      <p role="status" class="mt-5 text-sm text-muted">Consultando recursos…</p>
    } @else if (organizationId() && !store.problem()) {
      <p class="mt-5 text-sm text-muted">
        {{ store.entities().length }} recursos · La consulta admite hasta 100
        por empresa.
      </p>
      <ul
        aria-label="Recursos de la empresa"
        class="mt-5 grid gap-4 sm:grid-cols-2"
      >
        @for (r of store.entities(); track r.id) {
          <li class="min-w-0 rounded-3xl border border-line bg-white p-5">
            <p class="text-xs text-muted">
              {{ r.kind === 'lodging' ? 'Alojamiento' : 'Citas' }} ·
              {{ r.status === 'active' ? 'Activo' : 'Inactivo' }}
            </p>
            <h2 class="mt-3 text-lg font-semibold break-words">
              <a
                [routerLink]="[
                  '/servicios',
                  r.organizationId,
                  'recursos',
                  r.id,
                ]"
                class="text-primary"
                >{{ r.name }}</a
              >
            </h2>
            <p class="mt-3 text-sm text-muted">
              Capacidad {{ r.capacity }} · {{ r.windows.length }} franjas
              semanales · versión {{ r.version }}
            </p>
          </li>
        } @empty {
          <li class="text-sm text-muted">
            Esta empresa aún no tiene recursos.
          </li>
        }
      </ul>
    } @else if (!organizationId()) {
      <p class="mt-6 text-sm text-muted">
        Selecciona una empresa para consultar sus agendas.
      </p>
    }
  `,
})
export class ResourcesListPage {
  readonly store = inject(ResourceDirectoryStore);
  readonly companies = inject(ServicesListStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly organizationId = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('organizationId') ?? '')),
    { initialValue: '' },
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    search: [''],
    organizationId: [
      this.route.snapshot.queryParamMap.get('organizationId') ?? '',
    ],
  });
  readonly search = toSignal(
    this.form.controls.search.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
  readonly companyRequest = computed(() => ({
    search: this.search(),
    currentId: this.organizationId() || undefined,
  }));
  readonly resourceRequest = computed(() => this.organizationId() || null);
  constructor() {
    this.companies.findCompanies(this.companyRequest);
    this.store.load(this.resourceRequest);
  }
  choose() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        organizationId: this.form.controls.organizationId.value || null,
      },
    });
  }
}
