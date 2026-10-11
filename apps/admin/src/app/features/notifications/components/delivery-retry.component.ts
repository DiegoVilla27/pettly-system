import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Delivery } from '../models/notification';
import { retryCandidate } from '../models/notification';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-delivery-retry',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section
    class="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-7"
    aria-labelledby="retry-heading"
  >
    <h2 id="retry-heading" tabindex="-1" class="text-xl font-semibold">
      Preparar otro intento
    </h2>
    <p class="mt-3 text-xs break-all text-muted">Entrega {{ delivery().id }}</p>
    <p class="mt-3 text-sm text-muted">
      Se conserva el plazo {{ date(delivery().expiresAt) }}. La API comprueba
      destinatario, preferencias y vigencia. Crear el intento no confirma que el
      correo se entregó.
    </p>
    <form [formGroup]="form" (ngSubmit)="submit()" class="mt-5">
      <fieldset [disabled]="blocked() || !candidate()" class="space-y-5">
        <legend class="sr-only">Confirmación de recuperación</legend>
        <div>
          <label for="delivery-reason" class="mb-2 block text-sm font-semibold"
            >Motivo del reintento</label
          ><textarea
            id="delivery-reason"
            rows="3"
            maxlength="500"
            formControlName="reason"
            aria-describedby="delivery-reason-help"
            [attr.aria-invalid]="
              form.controls.reason.touched && form.controls.reason.invalid
            "
            class="w-full rounded-xl border border-line p-3"
          ></textarea>
          <p id="delivery-reason-help" class="mt-2 text-xs text-muted">
            Entre 10 y 500 caracteres, sin saltos de línea. Se conserva en la
            auditoría.
          </p>
        </div>
        <label class="flex items-start gap-3 text-sm"
          ><input
            type="checkbox"
            formControlName="confirmed"
            [attr.aria-invalid]="
              form.controls.confirmed.touched && form.controls.confirmed.invalid
            "
            class="mt-1 size-5 shrink-0"
          />Confirmo crear un nuevo intento de esta entrega</label
        ><button
          type="submit"
          class="min-h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Registrar reintento
        </button>
        @if (form.touched && form.invalid) {
          <p role="alert" class="text-sm">
            Escribe un motivo válido y confirma antes de continuar.
          </p>
        }
      </fieldset>
    </form>
    @if (!candidate()) {
      <p role="status" class="mt-4 text-sm">
        Esta entrega ya no reúne las condiciones visibles para un reintento.
        Actualiza la lista.
      </p>
    }
  </section>`,
})
export class DeliveryRetryComponent {
  readonly delivery = input.required<Delivery>();
  readonly now = input.required<number>();
  readonly blocked = input(false);
  readonly retried = output<{ id: string; reason: string }>();
  readonly date = colombiaDateTime;
  readonly form = inject(FormBuilder).nonNullable.group({
    reason: ['', auditReasonValidator],
    confirmed: [false, Validators.requiredTrue],
  });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  candidate() {
    return retryCandidate(this.delivery(), this.now());
  }
  constructor() {
    afterNextRender(() =>
      this.element.nativeElement.querySelector<HTMLElement>('h2')?.focus(),
    );
    effect(() => {
      const d = this.delivery();
      if (d) this.form.reset();
    });
  }
  submit() {
    if (this.blocked() || !this.candidate()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    this.retried.emit({
      id: this.delivery().id,
      reason: this.form.controls.reason.value.trim(),
    });
  }
}
