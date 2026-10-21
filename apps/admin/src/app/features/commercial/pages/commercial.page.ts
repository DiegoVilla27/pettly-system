import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { COMMERCIAL_GATEWAY } from '../models/commercial';
import { CommercialStore } from '../state/commercial.store';
import { PolicyEditorComponent } from '../components/policy-editor.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { toApiProblem } from '../../../core/api';
@Component({
  selector: 'app-commercial',
  imports: [
    ReactiveFormsModule,
    PolicyEditorComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [CommercialStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="text-3xl font-semibold">Condiciones comerciales</h1>
    <p class="mt-3 text-sm text-muted">
      Prepara recogida, envíos, impuestos y condiciones para que los clientes
      puedan comprar. Activar la política no habilita por sí solo la pasarela.
    </p>
    <label
      for="commercial-company-search"
      class="mt-5 block text-sm font-semibold"
      >Buscar empresa comercial</label
    ><input
      id="commercial-company-search"
      [formControl]="search"
      maxlength="100"
      class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
    /><label for="commercial-company" class="mt-4 block text-sm font-semibold"
      >Empresa comercial</label
    ><select
      id="commercial-company"
      [formControl]="company"
      (change)="selectCompany()"
      class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
    >
      <option value="">Selecciona una empresa</option>
      @for (o of companies.value() ?? []; track o.id) {
        <option [value]="o.id">{{ o.name }}</option>
      }
    </select>
    @if (companies.error()) {
      <app-problem [problem]="toProblem(companies.error())" />
    }
    <app-problem [problem]="store.problem()" />
    @if (store.loading()) {
      <p role="status" class="mt-5">Consultando condiciones…</p>
    }
    @if (store.success()) {
      <p role="status" class="mt-5 rounded-xl bg-sage p-4 text-sm">
        Condiciones comerciales guardadas.
      </p>
    }
    @if (store.refreshRequired()) {
      <p role="status" class="mt-4 text-sm">
        Actualiza las condiciones y revisa el historial antes de repetir.
      </p>
    }
    @if (store.loaded()) {
      <button
        type="button"
        (click)="store.load(id()); audit.reload()"
        [disabled]="store.busy()"
        class="mt-5 min-h-11 rounded-xl border border-line px-4"
      >
        Actualizar condiciones comerciales
      </button>
      @if (store.policy()?.currency !== 'COP' && store.policy()) {
        <p class="mt-5 text-sm">
          Política histórica en otra moneda. Se conserva para consulta; nuevas
          compras requieren COP.
        </p>
      } @else {
        <section class="mt-6 rounded-2xl border border-line bg-white p-5">
          @if (needsVariants()) {
            <label
              for="commercial-product-search"
              class="block text-sm font-semibold"
              >Buscar productos para impuestos</label
            ><input
              id="commercial-product-search"
              [formControl]="productSearch"
              maxlength="100"
              class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
            />
            @if (variants.error()) {
              <app-problem [problem]="toProblem(variants.error())" />
            }
            @if (variants.value(); as vp) {
              <app-pagination
                [page]="vp.page"
                [total]="vp.candidateTotal"
                [limit]="vp.limit"
                (pageChange)="variantPage.set($event)"
              />
            }
          }
          <div class="mt-5">
            <app-policy-editor
              [policy]="store.policy()"
              (needsVariants)="needsVariants.set($event)"
              [context]="id()"
              [variants]="variants.value()?.items ?? []"
              [blocked]="store.busy() || store.refreshRequired()"
              (submitted)="store.save({ id: id(), body: $event })"
            />
          </div>
        </section>
      }
      <section class="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 class="text-lg font-semibold">Historial comercial</h2>
        @if (audit.error()) {
          <app-problem [problem]="toProblem(audit.error())" />
        }
        @if (audit.value(); as history) {
          <ol aria-label="Historial comercial" class="mt-4 space-y-3">
            @for (e of history.items; track e.id) {
              <li class="rounded-xl border border-line p-3">
                <p class="font-semibold">Versión {{ e.version }}</p>
                <p class="mt-2 text-sm">{{ e.reason }}</p>
                <p class="mt-2 text-xs break-all">
                  {{ e.createdAt }} · Cuenta {{ e.actorId }}
                </p>
              </li>
            }
          </ol>
          <app-pagination
            [page]="history.page"
            [total]="history.total"
            [limit]="history.limit"
            (pageChange)="auditPage.set($event)"
          />
        }
      </section>
    }`,
})
export class CommercialPage {
  readonly store = inject(CommercialStore);
  private readonly gateway = inject(COMMERCIAL_GATEWAY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly toProblem = toApiProblem;
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly id = computed(() => this.params().get('organizationId') ?? '');
  readonly company = inject(FormBuilder).nonNullable.control('');
  readonly search = inject(FormBuilder).nonNullable.control('');
  readonly productSearch = inject(FormBuilder).nonNullable.control('');
  readonly searchValue = toSignal(
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );
  readonly productValue = toSignal(
    this.productSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
  readonly variantPage = signal(1);
  readonly auditPage = signal(1);
  readonly companies = rxResource({
    params: () => ({ search: this.searchValue(), id: this.id() }),
    stream: ({ params }) =>
      this.gateway.companies(params.search, params.id || undefined),
  });
  readonly needsVariants = signal(false);
  readonly variants = rxResource({
    params: () =>
      this.store.loaded() && this.needsVariants()
        ? {
            id: this.id(),
            page: this.variantPage(),
            search: this.productValue(),
          }
        : undefined,
    stream: ({ params }) =>
      this.gateway.variants(params.id, params.page, params.search),
  });
  readonly audit = rxResource({
    params: () =>
      this.store.loaded()
        ? {
            id: this.id(),
            page: this.auditPage(),
            version: this.store.policy()?.version ?? 0,
          }
        : undefined,
    stream: ({ params }) => this.gateway.audit(params.id, params.page),
  });
  constructor() {
    this.store.load(this.id);
    effect(() => {
      this.company.setValue(this.id(), { emitEvent: false });
      this.variantPage.set(1);
      this.auditPage.set(1);
    });
    effect(() => {
      this.productValue();
      this.variantPage.set(1);
    });
  }
  selectCompany() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { organizationId: this.company.value || null },
    });
  }
}
