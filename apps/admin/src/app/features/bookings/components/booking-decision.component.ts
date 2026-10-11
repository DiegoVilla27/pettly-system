import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  computed,
  effect,
  ElementRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  availableActions,
  actionLabels,
  type Booking,
  type BookingAction,
  type DecisionBody,
} from '../models/booking';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { decisionSchema } from '../mappers/bookings.mapper';
@Component({
  selector: 'app-booking-decision',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <section
    class="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-7"
    aria-labelledby="booking-action-heading"
  >
    <h2 id="booking-action-heading" class="text-xl font-semibold">
      Gestionar la reserva
    </h2>
    <p class="mt-3 text-sm text-muted">
      Solo se muestran acciones permitidas por estado y horario. La API
      comprueba permisos y plazos al registrar el cambio. El cobro se realiza en
      el establecimiento.
    </p>
    @if (actions().length) {
      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-5">
        <fieldset [disabled]="blocked()" class="space-y-5">
          <legend class="sr-only">Acción y motivo de la reserva</legend>
          <div>
            <label for="booking-action" class="mb-2 block text-sm font-semibold"
              >Acción de reserva</label
            ><select
              id="booking-action"
              formControlName="action"
              [attr.aria-invalid]="
                form.controls.action.touched && form.controls.action.invalid
              "
              class="min-h-12 w-full rounded-xl border border-line px-3"
            >
              <option value="">Selecciona una acción</option>
              @for (a of actions(); track a) {
                <option [value]="a">{{ actionLabels[a] }}</option>
              }
            </select>
          </div>
          <div>
            <label for="booking-reason" class="mb-2 block text-sm font-semibold"
              >Motivo de la decisión de reserva</label
            ><textarea
              id="booking-reason"
              formControlName="reason"
              rows="3"
              minlength="10"
              maxlength="500"
              aria-describedby="booking-reason-help"
              [attr.aria-invalid]="
                form.controls.reason.touched && form.controls.reason.invalid
              "
              class="w-full rounded-xl border border-line bg-paper p-3"
            ></textarea>
            <p id="booking-reason-help" class="mt-2 text-xs text-muted">
              Entre 10 y 500 caracteres, sin saltos de línea. Se conserva en el
              historial.
            </p>
          </div>
          <label class="flex items-start gap-3 text-sm"
            ><input
              type="checkbox"
              formControlName="confirmed"
              [attr.aria-invalid]="
                form.controls.confirmed.touched &&
                form.controls.confirmed.invalid
              "
              class="mt-1 size-5 shrink-0"
            />Confirmo la acción seleccionada y sus efectos sobre la
            reserva.</label
          ><button
            type="submit"
            class="min-h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Registrar decisión de reserva
          </button>
          @if (form.touched && form.invalid) {
            <p role="alert" class="text-sm">
              Selecciona una acción, escribe el motivo y confirma antes de
              continuar.
            </p>
          }
        </fieldset>
      </form>
    } @else {
      <p role="status" class="mt-4 rounded-xl bg-paper p-4 text-sm">
        No hay acciones disponibles en este momento. Actualiza la reserva para
        comprobar su estado. Las reservas cerradas conservan su historial.
      </p>
    }
  </section>`,
})
export class BookingDecisionComponent {
  readonly booking = input.required<Booking>();
  readonly now = input.required<number>();
  readonly blocked = input(false);
  readonly decided = output<{ action: BookingAction; body: DecisionBody }>();
  readonly actionLabels = actionLabels;
  readonly actions = computed(() =>
    availableActions(this.booking(), this.now()),
  );
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    action: ['', Validators.required],
    reason: ['', auditReasonValidator],
    confirmed: [false, Validators.requiredTrue],
  });
  constructor() {
    effect(() => {
      const booking = this.booking();
      if (!booking) return;
      this.form.reset();
    });
    effect(() => {
      if (
        !this.actions().includes(
          this.form.controls.action.value as BookingAction,
        )
      ) {
        this.form.controls.action.setValue('');
        this.form.controls.confirmed.setValue(false);
      }
    });
  }
  submit() {
    if (this.blocked()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>(
          '[formcontrolname="' +
            (this.form.controls.action.invalid
              ? 'action'
              : this.form.controls.reason.invalid
                ? 'reason'
                : 'confirmed') +
            '"]',
        )
        ?.focus();
      return;
    }
    const v = this.form.getRawValue(),
      action = this.actions().find((a) => a === v.action),
      body = decisionSchema.safeParse({
        expectedVersion: this.booking().version,
        reason: v.reason.trim(),
      });
    if (action && body.success) this.decided.emit({ action, body: body.data });
  }
}
