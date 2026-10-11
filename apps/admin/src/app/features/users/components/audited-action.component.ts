import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  computed,
  ElementRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { validReason } from './profile-editor.component';
import type { User, UserCommand } from '../models/user';
@Component({
  selector: 'app-audited-action',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section
    class="rounded-2xl border border-line bg-white p-6"
    [attr.aria-label]="title()"
  >
    <h2 class="text-lg font-semibold">{{ title() }}</h2>
    <p class="mt-3 text-sm leading-relaxed text-muted">{{ description() }}</p>
    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="mt-5 space-y-4"
      novalidate
    >
      <label
        [for]="'action-reason-' + kind()"
        class="block text-sm font-semibold"
        >Motivo de
        {{ kind() === 'status' ? 'cambio de estado' : 'reenvío' }}</label
      ><textarea
        [id]="'action-reason-' + kind()"
        rows="2"
        formControlName="reason"
        maxlength="500"
        [readOnly]="busy()"
        [attr.aria-invalid]="
          form.controls.reason.invalid && form.controls.reason.touched
        "
        [attr.aria-describedby]="'action-help-' + kind()"
        class="w-full rounded-xl border border-line px-4 py-3"
      ></textarea>
      <p [id]="'action-help-' + kind()" class="text-xs text-muted">
        10–500 caracteres, una sola línea. El motivo se registra en auditoría.
      </p>
      @if (form.controls.reason.invalid && form.controls.reason.touched) {
        <p class="text-sm text-danger">
          Escribe un motivo válido antes de confirmar.
        </p>
      }
      <button
        type="submit"
        [disabled]="busy()"
        class="min-h-11 rounded-xl border px-5 py-3 text-sm font-semibold disabled:opacity-60"
        [class.border-danger]="
          kind() === 'status' && user().status === 'active'
        "
        [class.text-danger]="kind() === 'status' && user().status === 'active'"
        [class.border-line]="kind() !== 'status' || user().status !== 'active'"
      >
        {{
          busy()
            ? 'Aplicando…'
            : kind() === 'status'
              ? user().status === 'active'
                ? 'Confirmar desactivación'
                : 'Confirmar reactivación'
              : 'Reenviar invitación'
        }}
      </button>
    </form>
  </section>`,
})
export class AuditedActionComponent {
  readonly user = input.required<User>();
  readonly kind = input.required<'status' | 'resend'>();
  readonly busy = input(false);
  readonly actionRequested = output<UserCommand>();
  readonly title = computed(() =>
    this.kind() === 'resend'
      ? 'Reenviar invitación'
      : this.user().status === 'active'
        ? 'Desactivar cuenta'
        : 'Reactivar cuenta',
  );
  readonly description = computed(() =>
    this.kind() === 'resend'
      ? 'Solo aplica a cuentas creadas por invitación que aún no la han aceptado. El enlace anterior se invalidará.'
      : this.user().status === 'active'
        ? 'Se cerrarán todas las sesiones de esta cuenta. El último superadministrador activo está protegido.'
        : 'La persona podrá volver a iniciar sesión si su correo está verificado. Las sesiones anteriores seguirán revocadas.',
  );
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    reason: ['', validReason],
  });
  submit() {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.element.nativeElement.querySelector('textarea')?.focus();
      return;
    }
    const reason = this.form.controls.reason.value.trim(),
      userId = this.user().id;
    this.actionRequested.emit(
      this.kind() === 'status'
        ? {
            kind: 'status',
            userId,
            body: {
              status: this.user().status === 'active' ? 'disabled' : 'active',
              reason,
            },
          }
        : { kind: 'resend', userId, body: { reason } },
    );
  }
}
