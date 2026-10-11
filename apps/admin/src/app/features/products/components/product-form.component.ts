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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { profileSchema } from '../mappers/products.mapper';
import type { Product, Profile, Category } from '../models/product';
@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent {
  readonly product = input<Product | null>(null);
  readonly categories = input.required<Category[]>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly contextKey = input('');
  readonly submitted = output<{ profile: Profile; reason: string }>();
  readonly error = signal('');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
    ],
    description: [
      '',
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(4000),
      ],
    ],
    brand: ['', Validators.maxLength(100)],
    categoryId: ['', Validators.required],
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  constructor() {
    effect(() => {
      this.contextKey();
      const p = this.product();
      this.form.reset({
        name: p?.name ?? '',
        description: p?.description ?? '',
        brand: p?.brand ?? '',
        categoryId: p?.categoryId ?? '',
        reason: '',
        confirm: false,
      });
      this.error.set('');
    });
  }
  submit() {
    if (this.busy() || this.blocked()) return;
    this.form.markAllAsTouched();
    const v = this.form.getRawValue(),
      profile = {
        name: v.name.trim(),
        description: v.description.trim(),
        brand: v.brand.trim() || null,
        categoryId: v.categoryId,
      };
    if (
      this.form.invalid ||
      !profileSchema.safeParse(profile).success ||
      !this.categories().some((c) => c.id === profile.categoryId)
    ) {
      this.error.set(
        'Revisa los campos, la categoría activa y la confirmación. No se permiten saltos de línea.',
      );
      this.element.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    this.submitted.emit({ profile, reason: v.reason.trim() });
  }
}
