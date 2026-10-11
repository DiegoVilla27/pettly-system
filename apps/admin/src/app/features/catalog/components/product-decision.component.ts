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
import type { Product, ProductReview } from '../models/catalog';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
@Component({
  selector: 'app-product-decision',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section
    class="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-7"
    aria-labelledby="product-decision-title"
  >
    <h2 id="product-decision-title" class="text-xl font-semibold">
      Decisión de publicación
    </h2>
    <p class="mt-3 text-sm leading-relaxed text-muted">
      Revisa el contenido, las variantes, los precios y las fotografías antes de
      decidir. Aprobar permite publicar si la empresa y la categoría siguen
      activas; no garantiza existencias disponibles.
    </p>
    @if (blocked()) {
      <p role="status" class="mt-4 rounded-xl bg-paper p-4 text-sm">
        El creador y los miembros de la empresa no pueden revisar sus propios
        productos.
      </p>
    }
    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="mt-5"
      aria-label="Revisar publicación de producto"
    >
      <fieldset [disabled]="busy() || blocked()" class="space-y-5">
        <legend class="sr-only">Decisión independiente</legend>
        <div>
          <label for="product-decision" class="mb-2 block text-sm font-semibold"
            >Decisión de producto</label
          ><select
            id="product-decision"
            formControlName="decision"
            [attr.aria-invalid]="
              form.controls.decision.invalid && form.controls.decision.touched
            "
            aria-describedby="product-decision-help"
            class="min-h-12 w-full rounded-xl border border-line bg-white px-3"
          >
            <option value="">Selecciona una decisión</option>
            <option value="approve">Aprobar publicación</option>
            <option value="reject">Rechazar publicación</option>
          </select>
          <p id="product-decision-help" class="mt-2 text-xs text-muted">
            Selecciona aprobar o rechazar. Ninguna decisión viene
            preseleccionada.
          </p>
        </div>
        <div>
          <label
            for="product-review-reason"
            class="mb-2 block text-sm font-semibold"
            >Motivo de revisión de producto</label
          ><textarea
            id="product-review-reason"
            formControlName="reason"
            maxlength="500"
            rows="3"
            [attr.aria-invalid]="
              form.controls.reason.invalid && form.controls.reason.touched
            "
            aria-describedby="product-reason-help"
            class="w-full rounded-xl border border-line bg-paper px-4 py-3"
          ></textarea>
          <p id="product-reason-help" class="mt-2 text-xs text-muted">
            Entre 10 y 500 caracteres, sin saltos de línea. Se conserva en la
            auditoría del producto.
          </p>
        </div>
        <button
          type="submit"
          class="min-h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {{ busy() ? 'Registrando…' : 'Registrar revisión de producto' }}
        </button>
      </fieldset>
    </form>
  </section>`,
})
export class ProductDecisionComponent {
  readonly product = input.required<Product>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly decision = output<ProductReview>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    decision: [
      '',
      [Validators.required, Validators.pattern(/^(approve|reject)$/)],
    ],
    reason: ['', auditReasonValidator],
  });
  constructor() {
    effect(() => {
      this.product();
      this.form.reset();
    });
  }
  submit() {
    if (this.busy() || this.blocked() || this.product().status !== 'pending')
      return;
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
    const value = this.form.getRawValue();
    this.decision.emit({
      approved: value.decision === 'approve',
      reason: value.reason.trim(),
      expectedVersion: this.product().version,
    });
  }
}
