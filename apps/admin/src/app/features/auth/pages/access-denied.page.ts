import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { AUTH_SESSION } from '../../../core/auth';
import { toApiProblem, type ApiProblem } from '../../../core/api';
import { BrandComponent } from '../../../shared/ui/brand.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
@Component({
  selector: 'app-access-denied',
  imports: [BrandComponent, IconComponent, ProblemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main
    id="main-content"
    tabindex="-1"
    class="flex min-h-dvh items-center justify-center bg-paper p-6"
  >
    <div
      class="w-full max-w-md rounded-3xl border border-line bg-white p-8 sm:p-10"
    >
      <app-brand />
      <div
        class="mt-10 flex size-14 items-center justify-center rounded-2xl bg-sage text-primary"
      >
        <app-icon name="lock" />
      </div>
      <h1 class="mt-6 text-2xl font-semibold">
        Tu cuenta necesita un acceso de equipo.
      </h1>
      <p class="mt-4 leading-relaxed text-muted">
        Iniciaste sesión como {{ session.identity()?.email }}. Para entrar a
        este espacio, un superadministrador debe asignarte un rol de
        administración o una membresía de empresa o refugio.
      </p>
      <div class="mt-6"><app-problem [problem]="error()" /></div>
      <button
        type="button"
        (click)="logout()"
        [disabled]="session.busy()"
        class="mt-6 min-h-12 w-full rounded-xl bg-primary p-3 font-semibold text-white hover:bg-primary-strong disabled:opacity-70"
      >
        Salir y usar otra cuenta
      </button>
    </div>
  </main>`,
})
export class AccessDeniedPage {
  readonly session = inject(AUTH_SESSION);
  readonly error = signal<ApiProblem | null>(null);
  async logout() {
    try {
      await this.session.logout();
    } catch (error) {
      this.error.set(toApiProblem(error));
    }
  }
}
