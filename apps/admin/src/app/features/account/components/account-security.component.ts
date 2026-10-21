import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AccountCommand, Sessions } from '../models/account';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
@Component({
  selector: 'app-account-security',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<form [formGroup]="form" (ngSubmit)="submit()">
    <fieldset [disabled]="blocked()">
      <legend class="text-lg font-semibold">Seguridad de mi cuenta</legend>
      <label for="account-action" class="mt-4 block text-sm font-semibold"
        >Cambio de seguridad</label
      ><select
        id="account-action"
        formControlName="action"
        class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
      >
        <option value="">Selecciona una acción</option>
        <option value="password">Cambiar contraseña</option>
        <option value="email">Cambiar correo electrónico</option>
        <option value="revoke">Cerrar una sesión</option>
        <option value="logout-all">Cerrar todas las sesiones</option>
        <option value="delete">Eliminar y anonimizar mi cuenta</option>
      </select>
      <p class="mt-3 text-sm text-muted">
        Cambiar contraseña o confirmar otro correo cierra todas las sesiones. La
        eliminación es definitiva y conserva referencias históricas; la API
        protege al último administrador y a responsables de organizaciones.
      </p>
      @if (['password', 'email', 'delete'].includes(action())) {
        <label
          for="account-current-password"
          class="mt-4 block text-sm font-semibold"
          >Contraseña actual para cambios sensibles</label
        ><input
          id="account-current-password"
          type="password"
          autocomplete="current-password"
          formControlName="password"
          maxlength="128"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        />
      }
      @if (action() === 'password') {
        <label
          for="account-new-password"
          class="mt-4 block text-sm font-semibold"
          >Nueva contraseña</label
        ><input
          id="account-new-password"
          type="password"
          autocomplete="new-password"
          formControlName="newPassword"
          maxlength="128"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        /><label
          for="account-password-repeat"
          class="mt-4 block text-sm font-semibold"
          >Repite la nueva contraseña</label
        ><input
          id="account-password-repeat"
          type="password"
          autocomplete="new-password"
          formControlName="repeat"
          maxlength="128"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        />
      }
      @if (action() === 'email') {
        <label for="account-new-email" class="mt-4 block text-sm font-semibold"
          >Nuevo correo electrónico</label
        ><input
          id="account-new-email"
          type="email"
          autocomplete="email"
          formControlName="email"
          maxlength="254"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        />
      }
      @if (action() === 'revoke') {
        <label
          for="account-revoke-session"
          class="mt-4 block text-sm font-semibold"
          >Sesión para cerrar</label
        ><select
          id="account-revoke-session"
          formControlName="sessionId"
          class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
        >
          <option value="">Selecciona una sesión de esta página</option>
          @for (s of sessions()?.items ?? []; track s.id) {
            <option [value]="s.id">
              {{ s.current ? 'Sesión actual' : 'Otra sesión' }} ·
              {{ s.createdAt }}
            </option>
          }
        </select>
      }
      @if (action() === 'delete') {
        <label
          for="account-delete-reason"
          class="mt-4 block text-sm font-semibold"
          >Motivo de eliminación</label
        ><textarea
          id="account-delete-reason"
          formControlName="reason"
          maxlength="500"
          class="mt-2 min-h-11 w-full rounded-xl border border-line p-3"
        ></textarea>
      }
      <label class="mt-4 flex min-h-11 items-center gap-3 text-sm"
        ><input
          type="checkbox"
          formControlName="confirm"
          class="size-5 accent-primary"
        />Confirmo la acción seleccionada y sus efectos sobre mi cuenta</label
      >
      @if (error()) {
        <p role="alert" class="mt-3 text-danger">{{ error() }}</p>
      }
      <button
        type="submit"
        class="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
      >
        Aplicar cambio de seguridad
      </button>
    </fieldset>
  </form>`,
})
export class AccountSecurityComponent {
  readonly sessions = input<Sessions | null>(null);
  readonly blocked = input(false);
  readonly submitted = output<AccountCommand>();
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    action: ['', Validators.required],
    password: [''],
    newPassword: [''],
    repeat: [''],
    email: [''],
    sessionId: [''],
    reason: [''],
    confirm: [false, Validators.requiredTrue],
  });
  readonly action = toSignal(this.form.controls.action.valueChanges, {
    initialValue: '',
  });
  constructor() {
    this.form.controls.action.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.form.controls.confirm.setValue(false);
        this.form.controls.password.reset('');
        this.form.controls.newPassword.reset('');
        this.form.controls.repeat.reset('');
        this.error.set('');
      });
  }
  submit() {
    if (this.blocked()) return;
    const v = this.form.getRawValue();
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Selecciona y confirma una acción.');
      return;
    }
    let command: AccountCommand;
    if (v.action === 'password') {
      if (
        v.newPassword.length < 12 ||
        v.newPassword.length > 128 ||
        v.password.length > 128 ||
        v.newPassword !== v.repeat ||
        !v.password
      ) {
        this.error.set(
          'Revisa la contraseña actual y la nueva contraseña de 12 a 128 caracteres.',
        );
        return;
      }
      command = {
        kind: 'password',
        body: { currentPassword: v.password, newPassword: v.newPassword },
      };
    } else if (v.action === 'email') {
      if (
        !v.password ||
        !v.email.trim() ||
        v.email.length > 254 ||
        Validators.email(this.form.controls.email)
      ) {
        this.error.set('Revisa el nuevo correo y la contraseña actual.');
        return;
      }
      command = {
        kind: 'email',
        body: { password: v.password, email: v.email.trim().toLowerCase() },
      };
    } else if (v.action === 'logout-all') {
      command = { kind: 'logout-all' };
    } else if (v.action === 'revoke') {
      const s = this.sessions()?.items.find((s) => s.id === v.sessionId);
      if (!s) {
        this.error.set('Selecciona una sesión de esta página.');
        return;
      }
      command = { kind: 'revoke', sessionId: s.id, current: s.current };
    } else if (v.action === 'delete') {
      if (!v.password || auditReasonValidator(this.form.controls.reason)) {
        this.error.set(
          'Revisa la contraseña actual y el motivo de 10 a 500 caracteres.',
        );
        return;
      }
      command = {
        kind: 'delete',
        body: { password: v.password, reason: v.reason.trim() },
      };
    } else return;
    this.form.reset();
    this.error.set('');
    this.submitted.emit(command);
  }
}
