import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  ElementRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Service, DecisionAction, DecisionBody } from '../models/service';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
@Component({
  selector: 'app-service-decision',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section
    class="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-7"
    aria-labelledby="service-decision-title"
  >
    <h2 id="service-decision-title" class="text-xl font-semibold">
      {{ review() ? 'Revisión independiente' : 'Estado de publicación' }}
    </h2>
    <p class="mt-3 text-sm leading-relaxed text-muted">
      {{
        review()
          ? 'Revisa precio, condiciones y recursos antes de aprobar. El creador y los miembros de la empresa no pueden revisar su servicio.'
          : 'Enviar requiere recursos activos. Pausar retira la publicación; archivar es definitivo. Las reservas existentes se conservan.'
      }}
    </p>
    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="mt-5"
      aria-label="Cambiar publicación del servicio"
    >
      <fieldset [disabled]="blocked()" class="space-y-5">
        <legend class="sr-only">Decisión y motivo</legend>
        <div>
          <label for="service-action" class="mb-2 block text-sm font-semibold"
            >Acción de servicio</label
          ><select
            id="service-action"
            formControlName="action"
            aria-describedby="service-action-help"
            [attr.aria-invalid]="
              form.controls.action.touched && form.controls.action.invalid
            "
            class="min-h-12 w-full rounded-xl border border-line bg-white px-3"
          >
            <option value="">Selecciona una acción</option>
            @if (review()) {
              <option value="approve">Aprobar publicación</option>
              <option value="reject">Rechazar publicación</option>
            } @else {
              @if (
                ['draft', 'rejected', 'paused'].includes(service().status) &&
                service().resourceIds.length
              ) {
                <option value="submit">Enviar a revisión</option>
              }
              @if (service().status === 'published') {
                <option value="pause">Pausar publicación</option>
              }
              @if (service().status !== 'archived') {
                <option value="archive">Archivar definitivamente</option>
              }
            }
          </select>
          <p id="service-action-help" class="mt-2 text-xs text-muted">
            Ninguna acción viene preseleccionada.
          </p>
        </div>
        <div>
          <label
            for="service-decision-reason"
            class="mb-2 block text-sm font-semibold"
            >Motivo de la decisión de servicio</label
          ><textarea
            id="service-decision-reason"
            formControlName="reason"
            maxlength="500"
            rows="3"
            aria-describedby="service-decision-help"
            [attr.aria-invalid]="
              form.controls.reason.touched && form.controls.reason.invalid
            "
            class="w-full rounded-xl border border-line bg-paper px-3 py-3"
          ></textarea>
          <p id="service-decision-help" class="mt-2 text-xs text-muted">
            Entre 10 y 500 caracteres sin saltos de línea. Se conserva en el
            historial.
          </p>
        </div>
        <label class="flex min-h-11 items-start gap-3 text-sm"
          ><input
            type="checkbox"
            formControlName="confirmed"
            class="mt-1 size-5 shrink-0 accent-primary"
            [attr.aria-invalid]="
              form.controls.confirmed.touched && form.controls.confirmed.invalid
            "
          />Confirmo la acción seleccionada y entiendo su efecto sobre la
          publicación.</label
        ><button
          type="submit"
          class="min-h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Registrar decisión de servicio
        </button>
      </fieldset>
    </form>
  </section>`,
})
export class ServiceDecisionComponent {
  readonly service = input.required<Service>();
  readonly review = input(false);
  readonly blocked = input(false);
  readonly decided = output<{ action: DecisionAction; body: DecisionBody }>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    action: ['', Validators.required],
    reason: ['', auditReasonValidator],
    confirmed: [false, Validators.requiredTrue],
  });
  constructor() {
    effect(() => {
      this.service();
      this.form.reset();
    });
  }
  submit() {
    if (this.blocked()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const key = Object.entries(this.form.controls).find(
        ([, c]) => c.invalid,
      )?.[0];
      this.element.nativeElement
        .querySelector<HTMLElement>(`[formcontrolname="${key}"]`)
        ?.focus();
      return;
    }
    const s = this.service(),
      v = this.form.getRawValue();
    const allowed: DecisionAction[] = this.review()
      ? s.status === 'pending'
        ? ['approve', 'reject']
        : []
      : s.status === 'archived'
        ? []
        : [
            'archive',
            ...(['draft', 'rejected', 'paused'].includes(s.status) &&
            s.resourceIds.length
              ? ['submit' as const]
              : []),
            ...(s.status === 'published' ? ['pause' as const] : []),
          ];
    const action = allowed.find((a) => a === v.action);
    if (!action) return;
    this.decided.emit({
      action,
      body: { reason: v.reason.trim(), expectedVersion: s.version },
    });
  }
}
