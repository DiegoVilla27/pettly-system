import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CategoriesStore } from '../state/categories.store';
import { CategoryFormComponent } from '../components/category-form.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import type { CategoryUpdate } from '../models/catalog';
@Component({
  selector: 'app-category-detail',
  imports: [RouterLink, DatePipe, CategoryFormComponent, ProblemComponent],
  providers: [CategoriesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/catalogo/categorias"
      class="text-sm font-medium text-primary hover:underline"
      >← Volver a categorías</a
    >
    <div class="mt-5"><app-problem [problem]="store.problem()" /></div>
    @if (store.loading()) {
      <p role="status" class="mt-5 text-sm text-muted">Cargando categoría…</p>
    } @else if (category(); as c) {
      <div class="mt-5 flex flex-wrap items-start justify-between gap-4">
        <h1 class="text-3xl font-semibold tracking-tight">{{ c.name }}</h1>
        <span class="rounded-full bg-paper px-3 py-1 text-sm">{{
          c.statusLabel
        }}</span>
      </div>
      <p class="mt-3 text-sm text-muted">
        Versión {{ c.version }} · Actualizada {{ c.updatedAt | date: 'medium' }}
      </p>
      <p class="mt-3 text-xs break-all text-muted">ID: {{ c.id }}</p>
      <div class="mt-5 flex flex-wrap items-center gap-3">
        <a
          [routerLink]="['auditoria']"
          class="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-medium"
          >Auditoría de categoría</a
        ><button
          type="button"
          (click)="store.load()"
          [disabled]="store.busy()"
          class="min-h-11 rounded-xl border border-line px-4 text-sm"
        >
          Actualizar categoría
        </button>
      </div>
      <p role="status" class="mt-4 text-sm text-primary">
        {{ store.success() }}
      </p>
      @if (c.status === 'archived') {
        <p class="mt-6 rounded-2xl bg-paper p-5 text-sm">
          Esta categoría está archivada y es de solo lectura.
        </p>
      } @else {
        @if (store.refreshRequired()) {
          <p role="status" class="mt-4 text-sm">
            Actualiza el listado y comprueba el estado antes de repetir el
            cambio.
          </p>
        }
        <app-category-form
          [category]="c"
          [busy]="store.busy() || store.refreshRequired()"
          (update)="save($event)"
        />
      }
    } @else {
      <h1 class="mt-5 text-2xl font-semibold">Categoría no disponible</h1>
      <p class="mt-3 text-sm text-muted">
        Revisa el identificador o vuelve al listado.
      </p>
      <button
        type="button"
        (click)="store.load()"
        class="mt-5 min-h-11 rounded-xl border border-line px-4"
      >
        Reintentar
      </button>
    }`,
})
export class CategoryDetailPage {
  readonly store = inject(CategoriesStore);
  readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('categoryId') ?? '')),
    { initialValue: '' },
  );
  readonly category = computed(() => this.store.entityMap()[this.id()] ?? null);
  constructor() {
    this.store.load();
  }
  save(body: CategoryUpdate) {
    if (this.category())
      this.store.execute({ kind: 'update', id: this.id(), body });
  }
}
