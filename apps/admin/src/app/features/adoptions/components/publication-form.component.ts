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
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { profileSchema } from '../mappers/publications.mapper';
import type { Publication, Profile } from '../models/publication';
const publicTextValidator: ValidatorFn = (control) =>
  typeof control.value === 'string' &&
  control.value.trim().length >= 2 &&
  !/\p{Cc}/u.test(control.value)
    ? null
    : { publicText: true };
@Component({
  selector: 'app-publication-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publication-form.component.html',
})
export class PublicationFormComponent {
  readonly publication = input<Publication | null>(null);
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly submitted = output<{ profile: Profile; reason: string }>();
  readonly contextKey = input('');
  readonly error = signal('');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly fields = [
    { key: 'title', label: 'Título público', max: 150, rows: 1 },
    { key: 'description', label: 'Descripción pública', max: 4000, rows: 4 },
    { key: 'conditions', label: 'Condiciones de adopción', max: 2000, rows: 4 },
    { key: 'city', label: 'Ciudad', max: 100, rows: 1 },
  ] as const;
  readonly form = inject(FormBuilder).nonNullable.group({
    title: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        publicTextValidator,
        Validators.maxLength(150),
      ],
    ],
    description: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        publicTextValidator,
        Validators.maxLength(4000),
      ],
    ],
    conditions: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        publicTextValidator,
        Validators.maxLength(2000),
      ],
    ],
    city: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        publicTextValidator,
        Validators.maxLength(100),
      ],
    ],
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  constructor() {
    effect(() => {
      this.contextKey();
      const p = this.publication();
      this.form.reset({
        title: p?.title ?? '',
        description: p?.description ?? '',
        conditions: p?.conditions ?? '',
        city: p?.city ?? '',
        reason: '',
        confirm: false,
      });
      this.error.set('');
    });
  }
  invalid(key: keyof typeof this.form.controls) {
    const c = this.form.controls[key];
    return c.invalid && c.touched;
  }
  submit() {
    if (this.busy() || this.blocked()) return;
    this.form.markAllAsTouched();
    const v = this.form.getRawValue(),
      p = profileSchema.safeParse({
        title: v.title.trim(),
        description: v.description.trim(),
        conditions: v.conditions.trim(),
        city: v.city.trim(),
        countryCode: 'CO',
      });
    if (this.form.invalid || !p.success) {
      this.error.set(
        'Revisa los campos. Usa texto continuo, sin saltos de línea, y respeta sus límites.',
      );
      this.element.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    this.submitted.emit({ profile: p.data, reason: v.reason.trim() });
  }
}
