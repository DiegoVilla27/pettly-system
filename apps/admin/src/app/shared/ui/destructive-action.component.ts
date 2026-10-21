import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { auditReasonValidator } from '../forms/audit-reason';
@Component({
  selector: 'app-destructive-action',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="rounded-2xl border border-line bg-white p-5">
    <h2 class="text-lg font-semibold">{{ title() }}</h2>
    <p class="mt-3 text-sm text-muted">{{ description() }}</p>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <fieldset [disabled]="blocked()">
        <legend class="sr-only">{{ title() }}</legend>
        <label
          [for]="id() + '-reason'"
          class="mt-4 block text-sm font-semibold"
          >{{ reasonLabel() }}</label
        ><textarea
          [id]="id() + '-reason'"
          formControlName="reason"
          maxlength="500"
          [attr.aria-invalid]="
            form.controls.reason.invalid && form.controls.reason.touched
          "
          class="mt-2 min-h-11 w-full rounded-xl border border-line p-3"
        ></textarea>
        <p class="mt-2 text-xs text-muted">
          Motivo de 10 a 500 caracteres, sin información personal ni saltos de
          línea.
        </p>
        <label class="mt-4 flex min-h-11 items-center gap-3 text-sm"
          ><input
            type="checkbox"
            formControlName="confirm"
            class="size-5 accent-primary"
          />Confirmo la eliminación definitiva y la conservación del
          historial</label
        >
        @if (form.invalid && form.touched) {
          <p role="alert" class="mt-3 text-danger">
            Escribe el motivo y confirma la acción.
          </p>
        }
        <button
          type="submit"
          class="mt-5 min-h-11 rounded-xl border border-danger px-4 text-sm font-semibold text-danger"
        >
          {{ title() }}
        </button>
      </fieldset>
    </form>
  </section>`,
})
export class DestructiveActionComponent {
  readonly id = input.required<string>();
  readonly title = input.required<string>();
  readonly reasonLabel = input.required<string>();
  readonly description = input.required<string>();
  readonly context = input.required<string>();
  readonly blocked = input(false);
  readonly confirmed = output<string>();
  readonly form = inject(FormBuilder).nonNullable.group({
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  constructor() {
    effect(() => {
      this.context();
      this.form.reset({ reason: '', confirm: false });
    });
  }
  submit() {
    if (this.blocked()) return;
    this.form.markAllAsTouched();
    if (this.form.valid)
      this.confirmed.emit(this.form.controls.reason.value.trim());
  }
}
