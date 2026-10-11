import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { preparationProfileSchema } from '../mappers/veterinary.mapper';
import type { Credential, CreateCredential } from '../models/credential';
@Component({
  selector: 'app-credential-profile-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <form [formGroup]="form" (ngSubmit)="submit()">
    <fieldset [disabled]="blocked()">
      <legend class="text-lg font-semibold">Cualificación profesional</legend>
      <label
        for="credential-profession"
        class="mt-4 block text-sm font-semibold"
        >Profesión</label
      ><select
        id="credential-profession"
        formControlName="profession"
        class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
      >
        <option value="veterinarian">Médico veterinario</option>
        <option value="veterinarian_zootechnician">
          Médico veterinario zootecnista
        </option>
      </select>
      <label
        for="credential-registration"
        class="mt-4 block text-sm font-semibold"
        >Matrícula profesional</label
      ><input
        id="credential-registration"
        formControlName="registrationNumber"
        inputmode="numeric"
        maxlength="15"
        class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
      />
      <label
        for="credential-university"
        class="mt-4 block text-sm font-semibold"
        >Universidad</label
      ><input
        id="credential-university"
        formControlName="university"
        maxlength="150"
        class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
      />
      <label
        for="credential-profile-reason"
        class="mt-4 block text-sm font-semibold"
        >Motivo del perfil profesional</label
      ><textarea
        id="credential-profile-reason"
        formControlName="reason"
        maxlength="500"
        class="mt-2 min-h-11 w-full rounded-xl border border-line p-3"
      ></textarea>
      <p class="mt-3 text-sm text-muted">
        Los cambios retiran la habilitación y exigen revisión independiente. La
        empresa, el profesional y su agenda quedan vinculados al crear la
        acreditación.
      </p>
      <label class="mt-4 flex min-h-11 items-center gap-3 text-sm"
        ><input
          type="checkbox"
          formControlName="consent"
          class="size-5 accent-primary"
        />El profesional ha consentido el tratamiento privado de su
        acreditación</label
      >
      @if (error()) {
        <p role="alert" class="mt-3 text-danger">{{ error() }}</p>
      }
      <button
        type="submit"
        class="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
      >
        Guardar perfil profesional
      </button>
    </fieldset>
  </form>`,
})
export class CredentialProfileFormComponent {
  readonly credential = input<Credential | null>(null);
  readonly blocked = input(false);
  readonly submitted = output<{
    profile: CreateCredential['profile'];
    reason: string;
  }>();
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    profession: ['veterinarian'],
    registrationNumber: [
      '',
      [Validators.required, Validators.pattern(/^\d{1,15}$/)],
    ],
    university: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
    ],
    reason: ['', auditReasonValidator],
    consent: [false, Validators.requiredTrue],
  });
  constructor() {
    effect(() => {
      const c = this.credential();
      this.form.reset({
        profession: c?.profession ?? 'veterinarian',
        registrationNumber: c?.registrationNumber ?? '',
        university: c?.university ?? '',
        consent: false,
        reason: '',
      });
      this.error.set('');
    });
  }
  submit() {
    if (this.blocked()) return;
    this.form.markAllAsTouched();
    const v = this.form.getRawValue(),
      parsed = preparationProfileSchema.safeParse({
        profession: v.profession,
        registrationNumber: v.registrationNumber,
        university: v.university.trim(),
        consent: v.consent,
      });
    if (this.form.invalid || !parsed.success) {
      this.error.set(
        'Revisa la matrícula, la universidad, el motivo y el consentimiento.',
      );
      return;
    }
    this.submitted.emit({ profile: parsed.data, reason: v.reason.trim() });
  }
}
