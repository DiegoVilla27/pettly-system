import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  effect,
  ElementRef,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from '@angular/forms';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import {
  profileChangesSchema,
  createSchema,
  countryOptions,
} from '../mappers/organizations.mapper';
import {
  requiredProfileFields,
  type OrganizationProfile,
  type OrganizationType,
  type CreateOrganization,
  type ProfileChanges,
} from '../models/organization';
type ProfileKey = keyof ProfileChanges;
const fields: ReadonlyArray<{
  key: ProfileKey;
  label: string;
  type: string;
  max: number;
  help: string;
  autocomplete?: string;
}> = [
  {
    key: 'name',
    label: 'Nombre de la organización',
    type: 'text',
    max: 150,
    help: 'Entre 2 y 150 caracteres.',
  },
  {
    key: 'legalName',
    label: 'Razón social',
    type: 'text',
    max: 150,
    help: 'Entre 2 y 150 caracteres; obligatoria para revisión.',
  },
  {
    key: 'registrationNumber',
    label: 'Número de registro',
    type: 'text',
    max: 60,
    help: 'Se normaliza sin puntos, espacios, guiones ni barras. No certifica su validez legal.',
  },
  {
    key: 'description',
    label: 'Descripción',
    type: 'text',
    max: 2000,
    help: 'Opcional; hasta 2000 caracteres, sin saltos de línea.',
  },
  {
    key: 'email',
    label: 'Correo de contacto',
    type: 'email',
    max: 254,
    help: 'Obligatorio para revisión. No es el correo de acceso del responsable.',
    autocomplete: 'email',
  },
  {
    key: 'phone',
    label: 'Teléfono',
    type: 'tel',
    max: 16,
    help: 'Formato internacional, por ejemplo +573001234567.',
    autocomplete: 'tel',
  },
  {
    key: 'website',
    label: 'Sitio web',
    type: 'url',
    max: 2048,
    help: 'Opcional; URL HTTPS sin usuario ni contraseña.',
    autocomplete: 'url',
  },
  {
    key: 'countryCode',
    label: 'País',
    type: 'text',
    max: 2,
    help: 'Obligatorio para revisión; forma parte de la identidad legal.',
    autocomplete: 'country',
  },
  {
    key: 'region',
    label: 'Departamento o región',
    type: 'text',
    max: 100,
    help: 'Opcional; máximo 100 caracteres.',
    autocomplete: 'address-level1',
  },
  {
    key: 'city',
    label: 'Ciudad',
    type: 'text',
    max: 100,
    help: 'Obligatoria para revisión; máximo 100 caracteres.',
    autocomplete: 'address-level2',
  },
  {
    key: 'address',
    label: 'Dirección',
    type: 'text',
    max: 200,
    help: 'Obligatoria para revisión; máximo 200 caracteres.',
    autocomplete: 'address-line1',
  },
  {
    key: 'addressLine2',
    label: 'Complemento de dirección',
    type: 'text',
    max: 200,
    help: 'Opcional; máximo 200 caracteres.',
    autocomplete: 'address-line2',
  },
  {
    key: 'postalCode',
    label: 'Código postal',
    type: 'text',
    max: 20,
    help: 'Opcional; máximo 20 caracteres.',
    autocomplete: 'postal-code',
  },
];
const validateField =
  (key: ProfileKey): ValidatorFn =>
  (control) => {
    let value = String(control.value).trim();
    if (key === 'email') value = value.toLowerCase();
    return profileChangesSchema.safeParse({
      [key]: key === 'name' ? value : value || null,
    }).success
      ? null
      : { format: true };
  };
@Component({
  selector: 'app-organization-editor',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization-editor.component.html',
})
export class OrganizationEditorComponent {
  readonly organization = input<OrganizationProfile | null>(null);
  readonly busy = input(false);
  readonly creation = output<CreateOrganization>();
  readonly update = output<{
    profile: ProfileChanges;
    reason: string;
    expectedVersion: number;
  }>();
  readonly issue = signal('');
  readonly fields = fields;
  readonly countries = countryOptions;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    name: [''],
    type: this.fb.control<OrganizationType>('business'),
    legalName: [''],
    registrationNumber: [''],
    description: [''],
    email: [''],
    phone: [''],
    website: [''],
    countryCode: [''],
    region: [''],
    city: [''],
    address: [''],
    addressLine2: [''],
    postalCode: [''],
    reason: ['', auditReasonValidator],
  });
  constructor() {
    effect(() => {
      const org = this.organization();
      this.issue.set('');
      for (const field of fields) {
        const control = this.form.controls[field.key];
        control.setValue(org?.[field.key] ?? '', { emitEvent: false });
        const mandatory =
          field.key === 'name' ||
          (!!org &&
            ['active', 'pending', 'suspended'].includes(org.status) &&
            requiredProfileFields.some((key) => key === field.key));
        control.setValidators([
          validateField(field.key),
          ...(mandatory ? [Validators.required] : []),
        ]);
        control.updateValueAndValidity({ emitEvent: false });
      }
      this.form.controls.type.setValue(org?.type ?? 'business', {
        emitEvent: false,
      });
      this.form.controls.reason.reset('');
    });
  }
  submit() {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    this.issue.set('');
    if (this.form.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>(
          'input.ng-invalid, select.ng-invalid, textarea.ng-invalid',
        )
        ?.focus();
      return;
    }
    const org = this.organization(),
      reason = this.form.controls.reason.value.trim();
    const entries = fields
      .map((field) => {
        let value = this.form.controls[field.key].value.trim();
        if (field.key === 'email') value = value.toLowerCase();
        if (field.key === 'registrationNumber')
          value = value.toUpperCase().replace(/[\s.\-/]/g, '');
        return [
          field.key,
          field.key === 'name' ? value : value || null,
        ] as const;
      })
      .filter(([key, value]) => !org || value !== org[key]);
    if (org) {
      if (!entries.length) {
        this.issue.set('No hay cambios en el perfil.');
        return;
      }
      const parsed = profileChangesSchema.safeParse(
        Object.fromEntries(entries),
      );
      if (!parsed.success) {
        this.issue.set('Revisa los datos del perfil.');
        return;
      }
      this.update.emit({
        profile: parsed.data,
        reason,
        expectedVersion: org.version,
      });
    } else {
      const values = Object.fromEntries(entries);
      const { name, ...profile } = values;
      const parsed = createSchema.safeParse({
        name,
        type: this.form.controls.type.value,
        profile,
        reason,
      });
      if (!parsed.success) {
        this.issue.set('Revisa los datos antes de crear la organización.');
        return;
      }
      this.creation.emit(parsed.data);
    }
  }
}
