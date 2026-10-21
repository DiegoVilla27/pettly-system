import { RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_SESSION } from '../../../core/auth';
import { toApiProblem, type ApiProblem } from '../../../core/api';
import { BrandComponent } from '../../../shared/ui/brand.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import {
  LoginFormComponent,
  type LoginCredentials,
} from '../components/login-form.component';
@Component({
  selector: 'app-login-page',
  imports: [RouterLink, BrandComponent, IconComponent, LoginFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
})
export class LoginPage {
  readonly session = inject(AUTH_SESSION);
  private readonly router = inject(Router);
  readonly error = signal<ApiProblem | null>(null);
  readonly problem = computed(() => {
    const state = this.session.state();
    return (
      this.error() ?? (state.phase === 'unavailable' ? state.problem : null)
    );
  });
  async retry() {
    this.error.set(null);
    await this.session.restore();
    if (this.session.identity())
      await this.router.navigateByUrl(
        this.session.identity()?.backofficeAllowed ? '/inicio' : '/sin-acceso',
      );
  }
  async submit(credentials: LoginCredentials) {
    this.error.set(null);
    try {
      await this.session.login(credentials.email, credentials.password);
      await this.router.navigateByUrl(
        this.session.identity()?.backofficeAllowed ? '/inicio' : '/sin-acceso',
      );
    } catch (error) {
      this.error.set(toApiProblem(error));
    }
  }
}
