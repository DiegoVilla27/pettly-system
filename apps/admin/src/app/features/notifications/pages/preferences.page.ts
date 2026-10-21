import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AUTH_SESSION } from '../../../core/auth';
import { PreferencesStore } from '../state/preferences.store';
import { PreferencesFormComponent } from '../components/preferences-form.component';
import { NotificationsNavComponent } from '../components/notifications-nav.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-notification-preferences',
  imports: [
    PreferencesFormComponent,
    NotificationsNavComponent,
    ProblemComponent,
  ],
  providers: [PreferencesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-notifications-nav
      [admin]="session.identity()?.role === 'super_admin'"
    />
    <header class="flex flex-wrap items-start justify-between gap-5">
      <div>
        <p class="text-xs font-semibold text-primary">Elige cómo acompañarte</p>
        <h1 class="mt-3 text-3xl font-semibold">Preferencias de correo</h1>
      </div>
      <button
        type="button"
        (click)="refresh()"
        [disabled]="store.busy() || store.loading()"
        class="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-50"
      >
        Actualizar preferencias
      </button>
    </header>
    <app-problem [problem]="store.problem()" />
    @if (store.message()) {
      <p role="status" class="mt-5 rounded-xl bg-sage p-4 text-sm text-primary">
        {{ store.message() }}
      </p>
    }
    @if (store.refreshRequired()) {
      <p role="status" class="mt-4 text-sm">
        Actualiza y revisa los valores guardados antes de volver a guardar. No
        se repite la operación automáticamente.
      </p>
    }
    <section
      class="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-7"
      aria-labelledby="email-choice"
    >
      <h2 id="email-choice" class="text-xl font-semibold">
        Correos opcionales
      </h2>
      @if (store.loading()) {
        <p role="status" class="mt-4 text-sm">Consultando preferencias…</p>
      } @else if (store.preferences(); as p) {
        <p class="mt-3 text-xs text-muted">
          Versión {{ p.version }} · Actualizado {{ date(p.updatedAt) }}
        </p>
        <app-notification-preferences-form
          [preferences]="p"
          [blocked]="store.busy() || store.refreshRequired()"
          (saved)="store.save($event)"
        />
      }
    </section>
    <section
      class="mt-6 rounded-3xl border border-line bg-sage p-5 sm:p-7"
      aria-labelledby="mandatory-channels"
    >
      <h2 id="mandatory-channels" class="text-lg font-semibold">
        Siempre disponibles
      </h2>
      <p class="mt-3 text-sm leading-relaxed">
        La bandeja dentro de Pettly, los correos de organizaciones y acceso, y
        los mensajes de seguridad de tu cuenta permanecen activos. Estas
        preferencias pertenecen solo a tu cuenta.
      </p>
    </section>`,
})
export class PreferencesPage {
  readonly store = inject(PreferencesStore);
  readonly session = inject(AUTH_SESSION);
  readonly date = colombiaDateTime;
  constructor() {
    this.store.load();
  }
  refresh() {
    if (!this.store.busy()) this.store.load();
  }
}
