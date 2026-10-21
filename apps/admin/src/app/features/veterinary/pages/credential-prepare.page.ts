import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { map, debounceTime, distinctUntilChanged } from 'rxjs';
import { VETERINARY_GATEWAY } from '../models/veterinary-gateway';
import { CredentialPreparationStore } from '../state/credential-preparation.store';
import { CredentialProfileFormComponent } from '../components/credential-profile-form.component';
import { CredentialEvidenceFormComponent } from '../components/credential-evidence-form.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { toApiProblem } from '../../../core/api';
import type { CreateCredential } from '../models/credential';
@Component({
  selector: 'app-credential-prepare',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CredentialProfileFormComponent,
    CredentialEvidenceFormComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [CredentialPreparationStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/veterinaria"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
      >← Acreditaciones</a
    >
    <h1 class="mt-3 text-3xl font-semibold">Preparar acreditación</h1>
    <p class="mt-3 text-sm text-muted">
      El profesional conserva la privacidad de sus evidencias. La revisión exige
      un administrador ajeno a la empresa.
    </p>
    <app-problem [problem]="store.problem()" />
    @if (store.loading()) {
      <p role="status" class="mt-4">Consultando acreditación…</p>
    }
    @if (store.success()) {
      <p role="status" class="mt-4 rounded-xl bg-sage p-4 text-sm">
        Cambio de acreditación registrado.
      </p>
    }
    @if (store.refreshRequired()) {
      <p role="status" class="mt-4 text-sm">
        Actualiza la acreditación y revisa su historial antes de continuar. Si
        estabas creando, comprueba el listado antes de iniciar otra.
      </p>
    }
    @if (id() === 'new') {
      <section class="mt-6 rounded-2xl border border-line bg-white p-5">
        <label
          for="credential-company-search"
          class="block text-sm font-semibold"
          >Buscar empresa para acreditación</label
        ><input
          id="credential-company-search"
          [formControl]="search"
          maxlength="100"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        /><label
          for="credential-company"
          class="mt-4 block text-sm font-semibold"
          >Empresa de acreditación</label
        ><select
          id="credential-company"
          [formControl]="company"
          class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
        >
          <option value="">Selecciona una empresa activa</option>
          @for (c of companies.value() ?? []; track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        @if (companies.error()) {
          <app-problem [problem]="toProblem(companies.error())" />
        }
        @if (professionals.error()) {
          <app-problem [problem]="toProblem(professionals.error())" />
        }
        @if (resources.error()) {
          <app-problem [problem]="toProblem(resources.error())" />
        }
        <label
          for="credential-professional"
          class="mt-4 block text-sm font-semibold"
          >Profesional titular</label
        ><select
          id="credential-professional"
          [formControl]="professional"
          class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
        >
          <option value="">Selecciona al profesional</option>
          @for (p of professionals.value()?.items ?? []; track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
        @if (professionals.value(); as pp) {
          <app-pagination
            [page]="pp.page"
            [total]="pp.total"
            [limit]="pp.limit"
            (pageChange)="professionalPage.set($event)"
          />
        }
        <label
          for="credential-resource"
          class="mt-4 block text-sm font-semibold"
          >Agenda dedicada</label
        ><select
          id="credential-resource"
          [formControl]="resource"
          class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
        >
          <option value="">Selecciona una agenda individual</option>
          @for (r of resources.value()?.items ?? []; track r.id) {
            <option [value]="r.id">{{ r.name }}</option>
          }
        </select>
        @if (resources.value(); as rp) {
          <app-pagination
            [page]="rp.page"
            [total]="rp.total"
            [limit]="rp.limit"
            (pageChange)="resourcePage.set($event)"
          />
        }
      </section>
    }
    @if (id() === 'new' || store.credential()) {
      @if (store.credential(); as c) {
        <p class="mt-5 text-sm">
          Matrícula {{ c.registrationNumber }} · {{ c.statusLabel }} · v{{
            c.version
          }}
        </p>
        <a
          [routerLink]="['/veterinaria', c.id]"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
          >Ver evidencias e historial</a
        ><button
          type="button"
          (click)="store.load(id())"
          [disabled]="store.busy()"
          class="ms-3 min-h-11 rounded-xl border border-line px-3"
        >
          Actualizar acreditación
        </button>
      }
      @if (store.credential()?.status !== 'pending') {
        <section class="mt-6 rounded-2xl border border-line bg-white p-5">
          <app-credential-profile-form
            [credential]="store.credential()"
            [blocked]="
              store.busy() ||
              store.refreshRequired() ||
              (id() === 'new' && !ready())
            "
            (submitted)="save($event)"
          />
        </section>
        @if (store.credential(); as c) {
          <section class="mt-6 rounded-2xl border border-line bg-white p-5">
            <app-credential-evidence-form
              [credential]="c"
              [blocked]="store.busy() || store.refreshRequired()"
              (submitted)="store.execute($event)"
            />
          </section>
        }
      } @else {
        <p class="mt-5 text-sm">
          La acreditación está en revisión; sus evidencias y perfil están
          bloqueados.
        </p>
      }
    }`,
})
export class CredentialPreparePage {
  readonly store = inject(CredentialPreparationStore);
  private readonly gateway = inject(VETERINARY_GATEWAY);
  private readonly router = inject(Router);
  readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('credentialId') ?? 'new'),
    ),
    { initialValue: 'new' },
  );
  readonly toProblem = toApiProblem;
  readonly search = inject(FormBuilder).nonNullable.control('');
  readonly company = inject(FormBuilder).nonNullable.control('');
  readonly professional = inject(FormBuilder).nonNullable.control('');
  readonly resource = inject(FormBuilder).nonNullable.control('');
  readonly searchValue = toSignal(
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    {
      initialValue: '',
    },
  );
  readonly companyId = toSignal(this.company.valueChanges, {
    initialValue: '',
  });
  readonly professionalPage = signal(1);
  readonly resourcePage = signal(1);
  readonly companies = rxResource({
    params: () => this.searchValue(),
    stream: ({ params }) => this.gateway.companies(params),
  });
  readonly professionals = rxResource({
    params: () =>
      this.companyId()
        ? { id: this.companyId(), page: this.professionalPage() }
        : undefined,
    stream: ({ params }) => this.gateway.professionals(params.id, params.page),
  });
  readonly resources = rxResource({
    params: () =>
      this.companyId()
        ? { id: this.companyId(), page: this.resourcePage() }
        : undefined,
    stream: ({ params }) => this.gateway.resources(params.id, params.page),
  });
  readonly professionalId = toSignal(this.professional.valueChanges, {
    initialValue: '',
  });
  readonly resourceId = toSignal(this.resource.valueChanges, {
    initialValue: '',
  });
  readonly ready = computed(
    () =>
      !!this.companies.value()?.some((c) => c.id === this.companyId()) &&
      !!this.professionals
        .value()
        ?.items.some((p) => p.id === this.professionalId()) &&
      !!this.resources.value()?.items.some((r) => r.id === this.resourceId()),
  );
  constructor() {
    this.store.load(this.id);
    effect(() => {
      this.companyId();
      this.professional.reset('');
      this.resource.reset('');
      this.professionalPage.set(1);
      this.resourcePage.set(1);
    });
    effect(() => {
      const c = this.store.credential();
      if (this.id() === 'new' && c && this.store.success())
        void this.router.navigate(['/veterinaria', c.id, 'preparar'], {
          replaceUrl: true,
        });
    });
  }
  save(v: { profile: CreateCredential['profile']; reason: string }) {
    const c = this.store.credential();
    if (this.id() === 'new') {
      if (!this.ready()) return;
      this.store.execute({
        kind: 'create',
        body: {
          organizationId: this.companyId(),
          professionalId: this.professionalId(),
          resourceId: this.resourceId(),
          ...v,
        },
      });
    } else if (c)
      this.store.execute({
        kind: 'configure',
        credentialId: c.id,
        body: {
          organizationId: c.organizationId,
          professionalId: c.professionalId,
          resourceId: c.resourceId,
          expectedVersion: c.version,
          ...v,
        },
      });
  }
}
