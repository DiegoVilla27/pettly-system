import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import {
  documentKinds,
  type Credential,
  type PreparationCommand,
} from '../models/credential';
@Component({
  selector: 'app-credential-evidence-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <form [formGroup]="form" (ngSubmit)="submit()">
    <fieldset [disabled]="blocked()">
      <legend class="text-lg font-semibold">
        Preparar evidencias y solicitar revisión
      </legend>
      <label
        for="credential-preparation-action"
        class="mt-4 block text-sm font-semibold"
        >Acción de acreditación</label
      ><select
        id="credential-preparation-action"
        formControlName="action"
        class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
      >
        <option value="">Selecciona una acción</option>
        <option value="upload">Añadir evidencia</option>
        <option value="remove">Eliminar evidencia</option>
        <option value="submit">Enviar acreditación a revisión</option>
      </select>
      @if (action() === 'upload') {
        <label
          for="credential-document-kind"
          class="mt-4 block text-sm font-semibold"
          >Tipo de evidencia</label
        ><select
          id="credential-document-kind"
          formControlName="kind"
          class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
        >
          @for (k of kinds; track k.value) {
            <option [value]="k.value">{{ k.label }}</option>
          }
        </select>
        <label
          for="credential-document-file"
          class="mt-4 block text-sm font-semibold"
          >Imagen de la evidencia</label
        ><input
          id="credential-document-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          (change)="choose($event)"
          class="mt-2 min-h-11 w-full rounded-xl border border-line p-3"
        />
        <p class="mt-2 text-xs text-muted">
          JPEG, PNG o WebP hasta 5 MiB. Máximo seis páginas; tarjeta, título y
          certificado son obligatorios antes del envío.
        </p>
      }
      @if (action() === 'remove') {
        <label
          for="credential-document-remove"
          class="mt-4 block text-sm font-semibold"
          >Evidencia para eliminar</label
        ><select
          id="credential-document-remove"
          formControlName="mediaId"
          class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
        >
          <option value="">Selecciona una página</option>
          @for (d of credential().documents; track d.mediaId; let i = $index) {
            <option [value]="d.mediaId">
              {{ i + 1 }} · {{ kindLabel(d.kind) }}
            </option>
          }
        </select>
      }
      <label
        for="credential-evidence-reason"
        class="mt-4 block text-sm font-semibold"
        >Motivo de la acreditación</label
      ><textarea
        id="credential-evidence-reason"
        formControlName="reason"
        maxlength="500"
        class="mt-2 min-h-11 w-full rounded-xl border border-line p-3"
      ></textarea>
      <label class="mt-4 flex min-h-11 items-center gap-3 text-sm"
        ><input
          type="checkbox"
          formControlName="confirm"
          class="size-5 accent-primary"
        />Confirmo la acción y la retirada de habilitación hasta nueva
        revisión</label
      >
      @if (error()) {
        <p role="alert" class="mt-3 text-danger">{{ error() }}</p>
      }
      <button
        type="submit"
        class="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
      >
        Registrar cambio de acreditación
      </button>
    </fieldset>
  </form>`,
})
export class CredentialEvidenceFormComponent {
  readonly credential = input.required<Credential>();
  readonly blocked = input(false);
  readonly submitted = output<PreparationCommand>();
  readonly kinds = documentKinds;
  readonly error = signal('');
  readonly file = signal<File | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    action: ['', Validators.required],
    kind: ['professional_card'],
    mediaId: [''],
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  readonly action = toSignal(this.form.controls.action.valueChanges, {
    initialValue: '',
  });
  constructor() {
    this.form.controls.action.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.file.set(null);
        this.form.controls.confirm.setValue(false);
        this.error.set('');
      });
    effect(() => {
      this.credential();
      this.file.set(null);
      this.form.reset({
        action: '',
        kind: 'professional_card',
        mediaId: '',
        reason: '',
        confirm: false,
      });
      this.error.set('');
    });
  }
  kindLabel(k: string) {
    return documentKinds.find((x) => x.value === k)?.label ?? k;
  }
  choose(e: Event) {
    this.file.set((e.target as HTMLInputElement).files?.[0] ?? null);
  }
  submit() {
    if (this.blocked()) return;
    const c = this.credential(),
      v = this.form.getRawValue(),
      body = { reason: v.reason.trim(), expectedVersion: c.version };
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set(
        'Selecciona la acción, escribe el motivo y confirma sus efectos.',
      );
      return;
    }
    if (v.action === 'upload') {
      const file = this.file(),
        kind = documentKinds.find((x) => x.value === v.kind)?.value;
      if (
        !file ||
        !kind ||
        c.documents.length >= 6 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size < 1 ||
        file.size > 5242880
      ) {
        this.error.set('Selecciona una imagen válida; máximo seis páginas.');
        return;
      }
      this.submitted.emit({
        kind: 'upload',
        credentialId: c.id,
        body: { ...body, file, kind },
      });
    } else if (v.action === 'remove') {
      if (!c.documents.some((d) => d.mediaId === v.mediaId)) {
        this.error.set('Selecciona una evidencia adjunta.');
        return;
      }
      this.submitted.emit({
        kind: 'remove',
        credentialId: c.id,
        mediaId: v.mediaId,
        body,
      });
    } else if (v.action === 'submit') {
      if (
        documentKinds.some((k) => !c.documents.some((d) => d.kind === k.value))
      ) {
        this.error.set(
          'Adjunta tarjeta profesional, título y certificado de vigencia.',
        );
        return;
      }
      this.submitted.emit({ kind: 'submit', credentialId: c.id, body });
    }
  }
}
