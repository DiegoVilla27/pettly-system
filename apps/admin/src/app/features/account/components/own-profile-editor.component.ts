import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  effect,
  signal,
  ElementRef,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
  type AbstractControl,
} from '@angular/forms';
import { countryCodes } from '@pettly/api-client';
import {
  nameSchema,
  birthDateSchema,
  profileSchema,
} from '../mappers/account.mapper';
import type {
  Profile as User,
  ProfileChanges as UserProfile,
} from '../models/account';

export { auditReasonValidator as validReason } from '../../../shared/forms/audit-reason';
type ProfileKey =
  | 'name'
  | 'lastName'
  | 'dateOfBirth'
  | 'phone'
  | 'countryCode'
  | 'region'
  | 'city'
  | 'address'
  | 'addressLine2'
  | 'postalCode';
const validName: ValidatorFn = (control: AbstractControl<string>) =>
  nameSchema.safeParse(String(control.value).trim()).success
    ? null
    : { name: true };
const optionalText =
  (max: number, pattern?: RegExp): ValidatorFn =>
  (control: AbstractControl<string>) => {
    const value = String(control.value).trim();
    return !value ||
      (value.length <= max &&
        !/\p{Cc}/u.test(value) &&
        (!pattern || pattern.test(value)))
      ? null
      : { format: true };
  };
@Component({
  selector: 'app-own-profile-editor',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './own-profile-editor.component.html',
})
export class OwnProfileEditorComponent {
  readonly user = input<User | null>(null);
  readonly busy = input(false);

  readonly update = output<UserProfile>();
  readonly issue = signal('');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    name: ['', validName],
    lastName: [
      '',
      [
        (control: AbstractControl<string>) =>
          !control.value && this.user()?.lastName === null
            ? null
            : validName(control),
      ],
    ],
    dateOfBirth: [
      '',
      [
        (control: AbstractControl<string>) =>
          !control.value || birthDateSchema.safeParse(control.value).success
            ? null
            : { birth: true },
      ],
    ],
    phone: ['', optionalText(16, /^\+[1-9]\d{6,14}$/)],
    countryCode: [
      '',
      [
        (control: AbstractControl<string>) =>
          !control.value || countryCodes.some((code) => code === control.value)
            ? null
            : { country: true },
      ],
    ],
    region: ['', optionalText(100)],
    city: ['', optionalText(100)],
    address: ['', optionalText(200)],
    addressLine2: ['', optionalText(200)],
    postalCode: ['', optionalText(20)],
    reason: [''],
  });
  readonly fields: ReadonlyArray<{
    key: ProfileKey;
    label: string;
    type: string;
    autocomplete: string;
    help: string;
    max: number;
  }> = [
    {
      key: 'name',
      label: 'Nombres',
      type: 'text',
      autocomplete: 'given-name',
      help: 'Entre 1 y 100 caracteres; letras, espacios y signos de nombres.',
      max: 100,
    },
    {
      key: 'lastName',
      label: 'Apellidos',
      type: 'text',
      autocomplete: 'family-name',
      help: 'Entre 1 y 100 caracteres; conserva apellidos compuestos.',
      max: 100,
    },
    {
      key: 'dateOfBirth',
      label: 'Fecha de nacimiento',
      type: 'date',
      autocomplete: 'bday',
      help: 'Opcional; fecha real, sin fechas futuras ni edades mayores de 120.',
      max: 10,
    },
    {
      key: 'phone',
      label: 'Teléfono',
      type: 'tel',
      autocomplete: 'tel',
      help: 'Opcional; formato internacional, por ejemplo +573001234567.',
      max: 16,
    },
    {
      key: 'countryCode',
      label: 'País',
      type: 'text',
      autocomplete: 'country',
      help: 'Opcional; país de la dirección.',
      max: 2,
    },
    {
      key: 'region',
      label: 'Departamento o región',
      type: 'text',
      autocomplete: 'address-level1',
      help: 'Opcional; máximo 100 caracteres.',
      max: 100,
    },
    {
      key: 'city',
      label: 'Ciudad',
      type: 'text',
      autocomplete: 'address-level2',
      help: 'Opcional; máximo 100 caracteres.',
      max: 100,
    },
    {
      key: 'address',
      label: 'Dirección',
      type: 'text',
      autocomplete: 'address-line1',
      help: 'Opcional; calle y número, máximo 200 caracteres.',
      max: 200,
    },
    {
      key: 'addressLine2',
      label: 'Complemento de dirección',
      type: 'text',
      autocomplete: 'address-line2',
      help: 'Opcional; apartamento, piso o indicaciones, máximo 200 caracteres.',
      max: 200,
    },
    {
      key: 'postalCode',
      label: 'Código postal',
      type: 'text',
      autocomplete: 'postal-code',
      help: 'Opcional; máximo 20 caracteres. Conserva ceros iniciales.',
      max: 20,
    },
  ];
  readonly countries = countryCodes
    .map((value) => ({
      value,
      label:
        new Intl.DisplayNames(['es'], { type: 'region' }).of(value) ?? value,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  constructor() {
    effect(() => {
      const user = this.user();
      if (user) {
        this.form.patchValue(
          {
            email: user.email,
            ...Object.fromEntries(
              this.fields.map((field) => [field.key, user[field.key] ?? '']),
            ),
          },
          { emitEvent: false },
        );
        this.form.controls.email.disable({ emitEvent: false });
      }
    });
  }
  submit() {
    if (this.busy()) return;
    this.issue.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.element.nativeElement
        .querySelector<HTMLInputElement>(
          'input.ng-invalid, select.ng-invalid, textarea.ng-invalid',
        )
        ?.focus();
      return;
    }
    const values = this.form.getRawValue(),
      user = this.user(),
      candidate: Record<string, string | null> = {};
    for (const { key } of this.fields) {
      const value = values[key].trim() || null;
      if (user && value === (user[key] ?? null)) continue;
      if ((key === 'name' || key === 'lastName') && !value) continue;
      candidate[key] = value;
    }
    const parsed = profileSchema.safeParse(candidate);
    if (!parsed.success) {
      this.issue.set('Revisa los campos del perfil.');
      return;
    }

    if (user) {
      if (!Object.keys(parsed.data).length) {
        this.issue.set('No hay cambios en el perfil.');
        return;
      }
      this.update.emit(parsed.data);
    }
  }
}
