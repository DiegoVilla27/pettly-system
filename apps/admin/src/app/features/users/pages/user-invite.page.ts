import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { USERS_GATEWAY } from '../models/users-gateway';
import type { InviteUser } from '../models/user';
import { ProfileEditorComponent } from '../components/profile-editor.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { type ApiProblem, toApiProblem } from '../../../core/api';
@Component({
  selector: 'app-user-invite',
  imports: [RouterLink, ProfileEditorComponent, ProblemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/usuarios"
      class="inline-flex min-h-11 items-center text-sm font-medium text-primary"
      >← Volver a usuarios</a
    >
    <h1 class="mt-4 text-3xl font-semibold tracking-tight">Invitar usuario</h1>
    <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
      La cuenta comienza con rol Usuario. Se enviará un enlace para verificar el
      correo y elegir una contraseña. Los roles se asignan después de aceptar la
      invitación.
    </p>
    <section class="mt-7 rounded-3xl border border-line bg-white p-6 sm:p-8">
      <app-problem [problem]="problem()" /><app-profile-editor
        [busy]="busy()"
        (invitation)="invite($event)"
      />
    </section>`,
})
export class UserInvitePage {
  private readonly gateway = inject(USERS_GATEWAY);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly problem = signal<ApiProblem | null>(null);
  async invite(body: InviteUser) {
    if (this.busy()) return;
    this.busy.set(true);
    this.problem.set(null);
    try {
      const user = await firstValueFrom(this.gateway.invite(body));
      await this.router.navigate(['/usuarios', user.id], {
        state: { invitationQueued: true },
      });
    } catch (error) {
      this.problem.set(toApiProblem(error));
    } finally {
      this.busy.set(false);
    }
  }
}
