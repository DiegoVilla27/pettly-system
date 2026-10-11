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
  type Order,
  type OrderAction,
  type DecisionBody,
} from '../models/order';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { decisionSchema } from '../mappers/orders.mapper';
@Component({
  selector: 'app-order-decision',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <section
    class="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-7"
    aria-labelledby="order-action-heading"
  >
    <h2 id="order-action-heading" class="text-xl font-semibold">
      Gestionar el pedido
    </h2>
    <p class="mt-3 text-sm text-muted">
      Solo se muestran acciones permitidas por estado y pago verificado. La API
      comprueba permisos y plazos al registrar el cambio. La preparación exige
      pago verificado. Las cancelaciones de pedidos pagados requieren el futuro
      flujo de reembolsos.
    </p>
    @if (actions().length) {
      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-5">
        <fieldset [disabled]="blocked()" class="space-y-5">
          <legend class="sr-only">Acción y motivo del pedido</legend>
          <div>
            <label for="order-action" class="mb-2 block text-sm font-semibold"
              >Acción de pedido</label
            ><select
              id="order-action"
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
            <label for="order-reason" class="mb-2 block text-sm font-semibold"
              >Motivo de la decisión de pedido</label
            ><textarea
              id="order-reason"
              formControlName="reason"
              rows="3"
              minlength="10"
              maxlength="500"
              aria-describedby="order-reason-help"
              [attr.aria-invalid]="
                form.controls.reason.touched && form.controls.reason.invalid
              "
              class="w-full rounded-xl border border-line bg-paper p-3"
            ></textarea>
            <p id="order-reason-help" class="mt-2 text-xs text-muted">
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
            />Confirmo la acción seleccionada y sus efectos sobre el
            pedido.</label
          ><button
            type="submit"
            class="min-h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Registrar decisión de pedido
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
        No hay acciones disponibles en este momento. Actualiza el pedido para
        comprobar su estado. Los pedidos cerrados conservan su historial.
      </p>
    }
  </section>`,
})
export class OrderDecisionComponent {
  readonly order = input.required<Order>();
  readonly now = input.required<number>();
  readonly blocked = input(false);
  readonly decided = output<{ action: OrderAction; body: DecisionBody }>();
  readonly actionLabels = actionLabels;
  readonly actions = computed(() => availableActions(this.order(), this.now()));
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    action: ['', Validators.required],
    reason: ['', auditReasonValidator],
    confirmed: [false, Validators.requiredTrue],
  });
  constructor() {
    effect(() => {
      const order = this.order();
      if (!order) return;
      this.form.reset();
    });
    effect(() => {
      if (
        !this.actions().includes(this.form.controls.action.value as OrderAction)
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
        expectedVersion: this.order().version,
        reason: v.reason.trim(),
      });
    if (action && body.success) this.decided.emit({ action, body: body.data });
  }
}
