import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ORGANIZATIONS_GATEWAY } from '../models/organizations-gateway';
import { toApiProblem } from '../../../core/api';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-my-organizations',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="text-3xl font-semibold">Mis organizaciones</h1>
    <p class="mt-3 text-sm text-muted">
      Consulta tus empresas y refugios. El administrador de cada organización
      puede mantener su perfil; el superadministrador asigna los roles y decide
      su habilitación.
    </p>
    <label for="my-organization-search" class="mt-5 block text-sm font-semibold"
      >Buscar mis organizaciones</label
    ><input
      id="my-organization-search"
      [formControl]="search"
      maxlength="100"
      class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
    />
    @if (data.isLoading()) {
      <p role="status" class="mt-5">Consultando organizaciones…</p>
    }
    @if (data.error()) {
      <app-problem [problem]="toProblem(data.error())" />
    }
    @if (data.value(); as result) {
      <ul class="mt-5 space-y-3" aria-label="Mis organizaciones">
        @for (o of result.items; track o.id) {
          <li>
            <a
              [routerLink]="['/organizaciones/mis-equipos', o.id]"
              class="block rounded-2xl border border-line bg-white p-5"
              ><p class="font-semibold">{{ o.name }}</p>
              <p class="mt-2 text-sm">
                {{ o.typeLabel }} · {{ o.statusLabel }}
              </p></a
            >
          </li>
        } @empty {
          <li>No hay organizaciones para esta búsqueda.</li>
        }
      </ul>
      <app-pagination
        [page]="result.page"
        [total]="result.total"
        [limit]="result.limit"
        (pageChange)="page.set($event)"
      />
    }`,
})
export class MyOrganizationsPage {
  private readonly gateway = inject(ORGANIZATIONS_GATEWAY);
  readonly toProblem = toApiProblem;
  readonly search = inject(FormBuilder).nonNullable.control('', [
    Validators.maxLength(100),
    Validators.pattern(/^[^\p{Cc}]*$/u),
  ]);
  readonly value = toSignal(
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );
  readonly page = signal(1);
  readonly data = rxResource({
    params: () => ({
      page: this.page(),
      limit: 20,
      search: this.value().trim() || undefined,
    }),
    stream: ({ params }) => this.gateway.mine(params),
  });
}
