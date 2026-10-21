import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrandComponent } from '../../../shared/ui/brand.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { AccessActionStore } from '../state/access-action.store';
import { AccessActionGateway } from '../services/access-action.gateway';
import type { AccessAction } from '../models/access-action';
@Component({
  selector: 'app-access-action',
  imports: [RouterLink, ReactiveFormsModule, BrandComponent, ProblemComponent],
  providers: [AccessActionStore, AccessActionGateway],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main
    id="main-content"
    class="mx-auto min-h-dvh max-w-xl px-5 py-10"
  >
    <app-brand />
    <h1 class="mt-8 text-3xl font-semibold">{{ title }}</h1>
    <p class="mt-4 text-sm text-muted">{{ description }}</p>
    <app-problem [problem]="store.problem()" />
    @if (store.success()) {
      <p role="status" class="mt-6 rounded-xl bg-sage p-4">{{ success }}</p>
    } @else if (store.uncertain()) {
      <p role="status" class="mt-6 text-sm">
        No podemos confirmar el resultado. Intenta iniciar sesión o solicita
        otro enlace antes de repetir.
      </p>
    } @else {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="mt-6 rounded-2xl border border-line bg-white p-5"
      >
        <fieldset [disabled]="store.busy()">
          <legend class="sr-only">{{ title }}</legend>
          @if (action === 'forgot' || action === 'resend') {
            <label for="access-action-email" class="block text-sm font-semibold"
              >Correo electrónico</label
            ><input
              id="access-action-email"
              type="email"
              autocomplete="email"
              formControlName="email"
              maxlength="254"
              class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
            />
          }
          @if (action === 'reset' || action === 'invitation') {
            <label
              for="access-action-password"
              class="block text-sm font-semibold"
              >Nueva contraseña</label
            ><input
              id="access-action-password"
              type="password"
              autocomplete="new-password"
              formControlName="password"
              maxlength="128"
              class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
            /><label
              for="access-action-repeat"
              class="mt-4 block text-sm font-semibold"
              >Repite la contraseña</label
            ><input
              id="access-action-repeat"
              type="password"
              autocomplete="new-password"
              formControlName="repeat"
              maxlength="128"
              class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
            />
            <p class="mt-2 text-xs text-muted">
              Entre 12 y 128 caracteres. No reutilices una contraseña.
            </p>
          }
          @if (needsToken && !token) {
            <p role="alert" class="mt-4 text-danger">
              Abre el enlace enviado por Pettly. Si venció, solicita uno nuevo.
            </p>
          }
          @if (error()) {
            <p role="alert" class="mt-4 text-danger">{{ error() }}</p>
          }
          <button
            type="submit"
            [disabled]="needsToken && !token"
            class="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
          >
            {{ store.busy() ? 'Procesando…' : button }}
          </button>
        </fieldset>
      </form>
    }
    <nav aria-label="Opciones de acceso" class="mt-6 flex flex-wrap gap-4">
      <a
        routerLink="/acceso"
        class="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
        >Ir al acceso</a
      ><a
        routerLink="/forgot-password"
        class="inline-flex min-h-11 items-center text-sm text-primary"
        >Recuperar contraseña</a
      ><a
        routerLink="/resend-verification"
        class="inline-flex min-h-11 items-center text-sm text-primary"
        >Solicitar verificación</a
      >
    </nav>
  </main>`,
})
export class AccessActionPage {
  readonly store = inject(AccessActionStore);
  private readonly route = inject(ActivatedRoute);
  readonly action = this.route.snapshot.data['action'] as AccessAction;
  readonly needsToken = !['forgot', 'resend'].includes(this.action);
  readonly token =
    new URLSearchParams(this.route.snapshot.fragment ?? '').get('token') ??
    this.route.snapshot.queryParamMap.get('token') ??
    '';
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    email: [''],
    password: [''],
    repeat: [''],
  });
  readonly titles: Record<AccessAction, string> = {
    forgot: 'Recuperar acceso',
    reset: 'Elige una nueva contraseña',
    verify: 'Verificar correo',
    resend: 'Solicitar verificación',
    invitation: 'Activar cuenta invitada',
    'confirm-email': 'Confirmar nuevo correo',
  };
  readonly title = this.titles[this.action];
  readonly description =
    this.action === 'invitation'
      ? 'Tu invitación activa la cuenta y verifica el correo. Los permisos los asigna el superadministrador.'
      : 'Completa este paso para acceder con seguridad a Pettly.';
  readonly button =
    this.action === 'forgot' || this.action === 'resend'
      ? 'Enviar enlace'
      : this.action === 'reset' || this.action === 'invitation'
        ? 'Guardar contraseña'
        : 'Confirmar correo';
  readonly success = ['forgot', 'resend'].includes(this.action)
    ? 'Si la cuenta cumple los requisitos, recibirás un enlace por correo.'
    : 'Acción completada. Ya puedes iniciar sesión.';
  constructor() {
    if (this.token)
      void inject(Router).navigate([], {
        relativeTo: this.route,
        queryParams: {},
        fragment: undefined,
        replaceUrl: true,
      });
  }
  submit() {
    const v = this.form.getRawValue();
    if (
      ['forgot', 'resend'].includes(this.action) &&
      (!v.email.trim() || Validators.email(this.form.controls.email))
    ) {
      this.error.set('Escribe un correo válido.');
      return;
    }
    if (
      ['reset', 'invitation'].includes(this.action) &&
      (v.password.length < 12 ||
        v.password.length > 128 ||
        v.password !== v.repeat)
    ) {
      this.error.set(
        'Las contraseñas deben coincidir y tener entre 12 y 128 caracteres.',
      );
      return;
    }
    this.error.set('');
    this.store.execute({
      action: this.action,
      token: this.token,
      email: v.email.trim().toLowerCase(),
      password: v.password,
    });
    this.form.controls.password.reset('');
    this.form.controls.repeat.reset('');
  }
}
