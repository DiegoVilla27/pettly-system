import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CategoriesStore } from '../state/categories.store';
import { CategoryFormComponent } from '../components/category-form.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import type { CategoryCreate } from '../models/catalog';
@Component({
  selector: 'app-category-create',
  imports: [RouterLink, CategoryFormComponent, ProblemComponent],
  providers: [CategoriesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/catalogo/categorias"
      class="text-sm font-medium text-primary hover:underline"
      >← Volver a categorías</a
    >
    <h1 class="mt-5 text-3xl font-semibold tracking-tight">Crear categoría</h1>
    <p class="mt-3 text-muted">
      La nueva categoría se crea activa. Cada alta conserva su motivo.
    </p>
    <div class="mt-5"><app-problem [problem]="store.problem()" /></div>
    @if (store.refreshRequired()) {
      <p role="status" class="mt-4 text-sm">
        Actualiza el listado y comprueba el estado antes de repetir el cambio.
      </p>
    }
    <app-category-form
      [busy]="store.busy() || store.refreshRequired()"
      (creation)="create($event)"
    />`,
})
export class CategoryCreatePage {
  readonly store = inject(CategoriesStore);
  private readonly router = inject(Router);
  constructor() {
    effect(() => {
      const saved = this.store.saved();
      if (saved) void this.router.navigate(['/catalogo/categorias', saved.id]);
    });
  }
  create(body: CategoryCreate) {
    this.store.execute({ kind: 'create', body });
  }
}
