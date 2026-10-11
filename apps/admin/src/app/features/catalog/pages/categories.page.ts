import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CategoriesStore } from '../state/categories.store';
import { ProblemComponent } from '../../../shared/ui/problem.component';
@Component({
  selector: 'app-categories',
  imports: [RouterLink, ReactiveFormsModule, ProblemComponent],
  providers: [CategoriesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories.page.html',
})
export class CategoriesPage {
  readonly store = inject(CategoriesStore);
  readonly form = inject(FormBuilder).nonNullable.group({
    search: [''],
    status: [''],
  });
  readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  readonly filtered = computed(() => {
    const v = this.values();
    const search = v.search?.trim().toLocaleLowerCase('es') ?? '';
    return this.store
      .entities()
      .filter(
        (c) =>
          (!v.status || c.status === v.status) &&
          (!search ||
            c.name.toLocaleLowerCase('es').includes(search) ||
            c.slug.includes(search)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });
  constructor() {
    this.store.load();
  }
}
