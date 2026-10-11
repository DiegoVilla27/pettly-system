import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AccountOption, Page } from '../models/organization';
import type { ApiProblem } from '../../../core/api';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-organization-account-picker',
  imports: [ReactiveFormsModule, ProblemComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="mt-5">
    <form
      [formGroup]="form"
      (ngSubmit)="search()"
      class="flex flex-wrap items-end gap-3"
      novalidate
    >
      <div class="min-w-0 flex-1">
        <label for="responsible-search" class="mb-2 block text-sm font-semibold"
          >Buscar cuenta responsable</label
        ><input
          id="responsible-search"
          type="search"
          formControlName="search"
          maxlength="100"
          [readOnly]="busy()"
          [attr.aria-invalid]="
            form.controls.search.invalid && form.controls.search.touched
          "
          aria-describedby="responsible-search-help"
          class="min-h-12 w-full rounded-xl border border-line bg-white px-4"
        />
        <p id="responsible-search-help" class="mt-2 text-xs text-muted">
          Nombre o correo; solo cuentas activas y verificadas.
        </p>
      </div>
      <button
        type="submit"
        [disabled]="busy() || loading()"
        class="min-h-12 rounded-xl border border-line px-5 text-sm font-semibold"
      >
        Buscar cuentas
      </button>
    </form>
    <div class="mt-4"><app-problem [problem]="problem()" /></div>
    @if (loading()) {
      <p role="status" class="mt-5 text-sm text-muted">Buscando cuentas…</p>
    }
    @if (accounts(); as results) {
      <fieldset [disabled]="busy()" class="mt-5">
        <legend class="mb-3 text-sm font-semibold">
          Selecciona una cuenta responsable
        </legend>
        <div class="space-y-2">
          @for (account of results.items; track account.id) {
            <label
              class="flex min-h-12 items-start gap-3 rounded-xl border border-line p-4"
              ><input
                type="radio"
                name="organization-responsible"
                class="mt-1"
                [value]="account.id"
                [checked]="selected()?.id === account.id"
                (change)="selection.emit(account)"
                [attr.aria-label]="account.fullName + ', ' + account.email"
              /><span class="min-w-0 text-sm"
                ><span class="block font-semibold">{{ account.fullName }}</span
                ><span class="mt-1 block break-all text-muted">{{
                  account.email
                }}</span></span
              ></label
            >
          } @empty {
            <p class="text-sm text-muted">
              No encontramos cuentas elegibles. Prueba otra búsqueda.
            </p>
          }
        </div>
      </fieldset>
      <app-pagination
        [page]="results.page"
        [limit]="results.limit"
        [total]="results.total"
        [busy]="busy() || loading()"
        (pageChange)="search($event)"
      />
    }
    @if (selected(); as account) {
      <p class="mt-5 rounded-xl bg-sage p-4 text-sm break-words">
        Responsable seleccionado: <strong>{{ account.fullName }}</strong> ·
        {{ account.email }}
      </p>
    }
  </div>`,
})
export class AccountPickerComponent {
  readonly accounts = input<Page<AccountOption> | null>(null);
  readonly selected = input<AccountOption | null>(null);
  readonly loading = input(false);
  readonly busy = input(false);
  readonly problem = input<ApiProblem | null>(null);
  readonly searchRequested = output<{ search: string; page: number }>();
  readonly selection = output<AccountOption>();
  readonly form = inject(FormBuilder).nonNullable.group({
    search: [
      '',
      [Validators.maxLength(100), Validators.pattern(/^[^\p{Cc}]*$/u)],
    ],
  });
  search(page = 1) {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.searchRequested.emit({
      search: this.form.controls.search.value.trim(),
      page,
    });
  }
}
