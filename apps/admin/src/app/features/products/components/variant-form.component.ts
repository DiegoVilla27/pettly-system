import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  signal,
  ElementRef,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from '@angular/forms';
import { copToMinor, minorToInput } from '../../../shared/forms/minor-money';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { variantProfileSchema } from '../mappers/products.mapper';
import type { Variant, VariantProfile } from '../models/product';
const priceValidator: ValidatorFn = (c) =>
  copToMinor(String(c.value)) === null ? { price: true } : null;
@Component({
  selector: 'app-variant-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './variant-form.component.html',
})
export class VariantFormComponent {
  readonly variant = input<Variant | null>(null);
  readonly contextKey = input.required<string>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly submitted = output<{
    profile: VariantProfile;
    reason: string;
    variantId?: string;
  }>();
  readonly error = signal('');
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = this.fb.group({
    sku: [
      '',
      [
        Validators.required,
        Validators.maxLength(64),
        Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
      ],
    ],
    price: ['', priceValidator],
    attributes: this.fb.array([this.attribute()]),
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  readonly rows = signal(this.form.controls.attributes.controls.slice());
  private attribute(key = '', value = '') {
    return this.fb.group({
      key: [
        key,
        [Validators.required, Validators.pattern(/^[a-z][a-z0-9_]{0,29}$/)],
      ],
      value: [
        value,
        [
          Validators.required,
          Validators.maxLength(80),
          Validators.pattern(/^[^\p{Cc}]+$/u),
        ],
      ],
    });
  }
  constructor() {
    effect(() => {
      this.contextKey();
      const v = this.variant();
      this.form.reset({
        sku: v?.sku ?? '',
        price: v ? minorToInput(v.priceMinor) : '',
        reason: '',
        confirm: false,
      });
      const attrs = this.form.controls.attributes;
      attrs.clear();
      for (const [k, value] of Object.entries(v?.attributes ?? {}))
        attrs.push(this.attribute(k, value));
      this.rows.set(attrs.controls.slice());
      this.error.set('');
    });
  }
  add() {
    if (this.busy() || this.blocked() || this.rows().length >= 10) return;
    const a = this.form.controls.attributes;
    a.push(this.attribute());
    this.rows.set(a.controls.slice());
  }
  remove(i: number) {
    if (this.busy() || this.blocked()) return;
    this.form.controls.attributes.removeAt(i);
    this.rows.set(this.form.controls.attributes.controls.slice());
  }
  submit() {
    if (this.busy() || this.blocked()) return;
    this.form.markAllAsTouched();
    const v = this.form.getRawValue(),
      priceMinor = copToMinor(v.price),
      keys = v.attributes.map((x) => x.key.trim()),
      attributes = Object.fromEntries(
        v.attributes.map((x) => [x.key.trim(), x.value.trim()]),
      );
    const profile = {
      sku: v.sku.trim().toUpperCase(),
      priceMinor: priceMinor ?? 0,
      attributes,
    };
    if (
      this.form.invalid ||
      new Set(keys).size !== keys.length ||
      !variantProfileSchema.safeParse(profile).success
    ) {
      this.error.set(
        'Revisa SKU, precio y atributos. Usa claves únicas en minúsculas y valores sin saltos de línea.',
      );
      this.element.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    this.submitted.emit({
      profile,
      reason: v.reason.trim(),
      ...(this.variant() ? { variantId: this.variant()?.id } : {}),
    });
  }
}
