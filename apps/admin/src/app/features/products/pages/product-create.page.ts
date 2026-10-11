import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ProductCreateStore } from '../state/product-create.store';
import { PRODUCTS_GATEWAY } from '../models/products-gateway';
import { ProductFormComponent } from '../components/product-form.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { ApiProblem, toApiProblem } from '../../../core/api';
import type { Profile } from '../models/product';
@Component({
  selector: 'app-product-create',
  imports: [RouterLink, ProductFormComponent, ProblemComponent],
  providers: [ProductCreateStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/productos"
      [queryParams]="{ organizationId: organizationId() }"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
      >← Volver a productos</a
    >
    <h1 class="mt-3 text-3xl font-semibold tracking-tight">Crear producto</h1>
    <p class="mt-3 text-sm text-muted">
      El borrador pertenece a la empresa seleccionada y se crea en COP. Después
      prepara variantes y fotografías para enviarlo a revisión.
    </p>
    <app-problem [problem]="store.problem()" />
    @if (categories.error()) {
      <app-problem [problem]="toProblem(categories.error())" />
    }
    @if (company.isLoading()) {
      <p role="status" class="mt-5 text-sm">Consultando empresa…</p>
    }
    @if (company.error()) {
      <app-problem [problem]="toProblem(company.error())" />
    }
    @if (company.value(); as s) {
      <section class="mt-6 rounded-2xl border border-line bg-white p-5">
        <p class="font-semibold">{{ s.name }}</p>
        <p class="mt-1 text-xs break-all text-muted">{{ s.id }}</p>
        @if (store.uncertain()) {
          <p role="status" class="mt-4 text-sm">
            Consulta el listado antes de intentar otra creación. No hay
            reintento automático.
          </p>
        }
        <app-product-form
          [categories]="categories.value() ?? []"
          [contextKey]="organizationId()"
          [busy]="store.busy()"
          [blocked]="
            store.uncertain() || !!store.created() || !categories.hasValue()
          "
          (submitted)="create($event)"
        />
      </section>
    }`,
})
export class ProductCreatePage {
  readonly store = inject(ProductCreateStore);
  private readonly router = inject(Router);
  private readonly gateway = inject(PRODUCTS_GATEWAY);
  readonly toProblem = toApiProblem;
  readonly organizationId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('organizationId') ?? ''),
    ),
    { initialValue: '' },
  );
  readonly categories = rxResource({ stream: () => this.gateway.categories() });
  readonly company = rxResource({
    params: () => this.organizationId(),
    stream: ({ params }) =>
      this.gateway.companies('', params).pipe(
        map((items) => {
          const s = items.find((i) => i.id === params);
          if (!s)
            throw new ApiProblem(
              403,
              'FORBIDDEN',
              'Selecciona una empresa activa y autorizada.',
            );
          return s;
        }),
      ),
  });
  constructor() {
    effect(() => {
      const a = this.store.created();
      if (a && a.organizationId === this.organizationId())
        void this.router.navigate(['/productos', a.organizationId, a.id], {
          replaceUrl: true,
        });
    });
  }
  create(v: { profile: Profile; reason: string }) {
    if (
      !this.store.busy() &&
      !this.store.uncertain() &&
      this.company.value()?.id === this.organizationId()
    )
      this.store.create({ organizationId: this.organizationId(), ...v });
  }
}
