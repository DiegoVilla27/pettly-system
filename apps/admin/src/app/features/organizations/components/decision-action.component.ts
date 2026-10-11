import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  effect,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
@Component({
  selector: 'app-organization-decision',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <section
    class="rounded-3xl border border-line bg-white p-6 sm:p-8"
    [attr.aria-label]="title()"
  >
    <h2 class="text-xl font-semibold">{{ title() }}</h2>
    <p class="mt-3 text-sm leading-relaxed text-muted">{{ description() }}</p>
    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="mt-6 space-y-4"
      novalidate
    >
      <label [for]="id() + '-reason'" class="block text-sm font-semibold">{{
        reasonLabel()
      }}</label
      ><textarea
        [id]="id() + '-reason'"
        formControlName="reason"
        rows="2"
        maxlength="500"
        [readOnly]="busy()"
        [attr.aria-invalid]="
          form.controls.reason.invalid && form.controls.reason.touched
        "
        [attr.aria-describedby]="id() + '-help'"
        class="w-full rounded-xl border border-line px-4 py-3"
      ></textarea>
      <p [id]="id() + '-help'" class="text-xs text-muted">
        10–500 caracteres, una sola línea. Quedará registrado en auditoría.
      </p>
      @if (form.controls.reason.invalid && form.controls.reason.touched) {
        <p class="text-sm text-danger">
          Escribe un motivo válido antes de confirmar.
        </p>
      }
      <button
        type="submit"
        [disabled]="busy() || blocked()"
        class="min-h-12 rounded-xl border px-5 py-3 text-sm font-semibold disabled:opacity-50"
        [class.border-danger]="danger()"
        [class.text-danger]="danger()"
        [class.border-line]="!danger()"
      >
        {{ busy() ? 'Aplicando…' : buttonLabel() }}
      </button>
    </form>
  </section>`,
})
export class DecisionActionComponent {
  readonly id = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly buttonLabel = input.required<string>();
  readonly reasonLabel = input.required<string>();
  readonly context = input.required<string>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly danger = input(false);
  readonly confirmed = output<string>();
  readonly form = inject(FormBuilder).nonNullable.group({
    reason: ['', auditReasonValidator],
  });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    effect(() => {
      this.context();
      this.form.reset({ reason: '' });
    });
  }
  submit() {
    if (this.busy() || this.blocked()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.element.nativeElement.querySelector('textarea')?.focus();
      return;
    }
    this.confirmed.emit(this.form.controls.reason.value.trim());
  }
}
