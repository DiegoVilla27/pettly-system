import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  ElementRef,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from '@angular/forms';
import type { InventoryRow, MovementInput } from '../models/inventory';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { validInput } from '../mappers/inventory.mapper';
const units: ValidatorFn = (c) =>
  typeof c.value === 'number' &&
  Number.isInteger(c.value) &&
  c.value !== 0 &&
  Math.abs(c.value) <= 1000000
    ? null
    : { quantity: true };
@Component({
  selector: 'app-movement-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './movement-form.component.html',
})
export class MovementFormComponent {
  readonly row = input.required<InventoryRow>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly submitted = output<MovementInput>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    kind: [
      '',
      [Validators.required, Validators.pattern(/^(receipt|issue|adjustment)$/)],
    ],
    quantity: [0, units],
    reason: ['', auditReasonValidator],
  });
  constructor() {
    effect(() => {
      this.row();
      this.form.reset();
    });
  }
  submit() {
    if (
      this.busy() ||
      this.blocked() ||
      this.row().variantStatus !== 'active' ||
      this.row().productStatus === 'archived'
    )
      return;
    this.form.controls.quantity.updateValueAndValidity({ emitEvent: false });
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if ((v.kind === 'receipt' || v.kind === 'issue') && v.quantity <= 0)
      this.form.controls.quantity.setErrors({ positive: true });
    const delta = v.kind === 'issue' ? -v.quantity : v.quantity;
    if (this.row().stock.onHand + delta < this.row().stock.reserved)
      this.form.controls.quantity.setErrors({ available: true });
    if (this.form.invalid) {
      const key = Object.entries(this.form.controls).find(
        ([, c]) => c.invalid,
      )?.[0];
      this.element.nativeElement
        .querySelector<HTMLElement>(`[formcontrolname="${key}"]`)
        ?.focus();
      return;
    }
    if (v.kind !== 'receipt' && v.kind !== 'issue' && v.kind !== 'adjustment')
      return;
    const body: MovementInput = {
      kind: v.kind,
      quantity: v.quantity,
      reason: v.reason.trim(),
    };
    if (validInput(body)) this.submitted.emit(body);
  }
}
