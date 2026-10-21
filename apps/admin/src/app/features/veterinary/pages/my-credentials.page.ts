import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { VETERINARY_GATEWAY } from '../models/veterinary-gateway';
import { parseFilters } from '../mappers/veterinary.mapper';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { toApiProblem } from '../../../core/api';
@Component({
  selector: 'app-my-credentials',
  imports: [RouterLink, ProblemComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="text-3xl font-semibold">Mis acreditaciones</h1>
    <p class="mt-3 text-sm text-muted">
      Prepara tus evidencias para una revisión independiente. Subir documentos
      no habilita el servicio.
    </p>
    <a
      routerLink="/veterinaria/nueva"
      class="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white"
      >Preparar acreditación</a
    >
    @if (data.isLoading()) {
      <p role="status" class="mt-4">Consultando acreditaciones…</p>
    }
    @if (data.error()) {
      <app-problem [problem]="toProblem(data.error())" />
    }
    @if (data.value(); as result) {
      <ul class="mt-5 space-y-3" aria-label="Mis acreditaciones">
        @for (c of result.items; track c.id) {
          <li>
            <a
              [routerLink]="['/veterinaria', c.id]"
              class="block rounded-2xl border border-line bg-white p-5"
              ><p class="font-semibold">
                {{ c.professionLabel }} · {{ c.registrationNumber }}
              </p>
              <p class="mt-2 text-sm">{{ c.statusLabel }}</p></a
            >
          </li>
        } @empty {
          <li>No tienes acreditaciones en esta página.</li>
        }
      </ul>
      <app-pagination
        [page]="result.page"
        [total]="result.total"
        [limit]="result.limit"
        (pageChange)="page($event)"
      />
    }`,
})
export class MyCredentialsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gateway = inject(VETERINARY_GATEWAY);
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly toProblem = toApiProblem;
  readonly data = rxResource({
    params: () => parseFilters(this.params()),
    stream: ({ params }) => this.gateway.mine(params),
  });
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...parseFilters(this.params()), page },
    });
  }
}
