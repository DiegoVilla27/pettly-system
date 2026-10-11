import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  ElementRef,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
} from '@angular/forms';
import type {
  Category,
  CategoryCreate,
  CategoryUpdate,
} from '../models/catalog';
import {
  textSchema,
  slugSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../mappers/catalog.mapper';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
const name: ValidatorFn = (c) =>
  textSchema(100, 2).safeParse(String(c.value).trim()).success
    ? null
    : { name: true };
const slug: ValidatorFn = (c) =>
  slugSchema.safeParse(String(c.value).trim()).success ? null : { slug: true };
const description: ValidatorFn = (c) =>
  !c.value || textSchema(1000, 2).safeParse(String(c.value).trim()).success
    ? null
    : { description: true };
@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-form.component.html',
})
export class CategoryFormComponent {
  readonly category = input<Category | null>(null);
  readonly busy = input(false);
  readonly creation = output<CategoryCreate>();
  readonly update = output<CategoryUpdate>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly message = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', name],
    slug: ['', slug],
    description: ['', description],
    status: ['active'],
    reason: ['', auditReasonValidator],
  });
  constructor() {
    effect(() => {
      const c = this.category();
      this.form.reset({
        name: c?.name ?? '',
        slug: c?.slug ?? '',
        description: c?.description ?? '',
        status: c?.status ?? 'active',
        reason: '',
      });
      this.message.set('');
    });
  }
  submit() {
    if (this.busy() || this.category()?.status === 'archived') return;
    this.message.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const key = Object.entries(this.form.controls).find(
        ([, control]) => control.invalid,
      )?.[0];
      this.element.nativeElement
        .querySelector<HTMLElement>(`[formcontrolname="${key}"]`)
        ?.focus();
      return;
    }
    const v = this.form.getRawValue(),
      c = this.category();
    if (!c) {
      const body: CategoryCreate = {
        name: v.name.trim(),
        slug: v.slug.trim(),
        description: v.description.trim() || null,
        reason: v.reason.trim(),
      };
      if (!createCategorySchema.safeParse(body).success) {
        this.message.set('Revisa el nombre, el identificador y el motivo.');
        return;
      }
      this.creation.emit(body);
      return;
    }
    const profile: CategoryUpdate['profile'] = {};
    if (v.name.trim() !== c.name) profile.name = v.name.trim();
    if (v.slug.trim() !== c.slug) profile.slug = v.slug.trim();
    if ((v.description.trim() || null) !== c.description)
      profile.description = v.description.trim() || null;
    if (v.status !== c.status) {
      if (v.status !== 'active' && v.status !== 'inactive') {
        this.message.set('Selecciona un estado válido.');
        return;
      }
      profile.status = v.status;
    }
    if (!Object.keys(profile).length) {
      this.message.set('No hay cambios de perfil o estado para guardar.');
      return;
    }
    const body: CategoryUpdate = {
      profile,
      expectedVersion: c.version,
      reason: v.reason.trim(),
    };
    if (!updateCategorySchema.safeParse(body).success) {
      this.message.set('Revisa los campos antes de guardar.');
      return;
    }
    this.update.emit(body);
  }
}
