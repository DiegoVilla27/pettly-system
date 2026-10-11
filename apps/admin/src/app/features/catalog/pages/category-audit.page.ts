import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CategoriesStore } from '../state/categories.store';
import { parseQueue } from '../mappers/catalog.mapper';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-category-audit',
  imports: [RouterLink, DatePipe, ProblemComponent, PaginationComponent],
  providers: [CategoriesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      [routerLink]="['/catalogo/categorias', id()]"
      class="text-sm font-medium text-primary hover:underline"
      >← Volver a categoría</a
    >
    <h1 class="mt-5 text-3xl font-semibold tracking-tight">
      Auditoría de categoría
    </h1>
    <p class="mt-3 text-sm text-muted">
      Altas, cambios y motivos conservados en un historial inmutable.
    </p>
    <div class="mt-5"><app-problem [problem]="store.auditProblem()" /></div>
    @if (store.auditLoading()) {
      <p role="status" class="mt-5 text-sm text-muted">Cargando auditoría…</p>
    } @else if (store.auditProblem()) {
      <button
        type="button"
        (click)="store.auditLoad(request())"
        class="mt-5 min-h-11 rounded-xl border border-line px-4"
      >
        Reintentar auditoría
      </button>
    } @else if (store.audit(); as audit) {
      <ol class="mt-6 space-y-4" aria-label="Auditoría de categoría">
        @for (a of audit.items; track a.id) {
          <li class="rounded-2xl border border-line bg-white p-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="font-semibold">{{ a.actionLabel }}</h2>
              <time [attr.datetime]="a.createdAt" class="text-xs text-muted">{{
                a.createdAt | date: 'medium'
              }}</time>
            </div>
            <p class="mt-3 text-sm break-words">{{ a.reason }}</p>
            <dl class="mt-4 grid gap-4 text-xs sm:grid-cols-2">
              <div>
                <dt class="text-muted">Cuenta que registró el cambio</dt>
                <dd class="mt-1 break-all">{{ a.actorId }}</dd>
              </div>
              <div>
                <dt class="text-muted">Referencia de solicitud</dt>
                <dd class="mt-1 break-all">{{ a.requestId }}</dd>
              </div>
            </dl>
          </li>
        } @empty {
          <li class="text-sm text-muted">No hay cambios registrados.</li>
        }
      </ol>
      <app-pagination
        [page]="audit.page"
        [limit]="audit.limit"
        [total]="audit.total"
        (pageChange)="page($event)"
      />
    }`,
})
export class CategoryAuditPage {
  readonly store = inject(CategoriesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('categoryId') ?? '')),
    { initialValue: '' },
  );
  readonly requestedPage = toSignal(
    this.route.queryParamMap.pipe(map((p) => parseQueue(p).page ?? 1)),
    { initialValue: 1 },
  );
  readonly request = computed(() => ({
    id: this.id(),
    page: this.requestedPage(),
  }));
  constructor() {
    this.store.auditLoad(this.request);
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
}
