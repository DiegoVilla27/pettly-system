import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UserDetailStore } from '../state/user-detail.store';
import { UserHeadingComponent } from '../components/user-heading.component';
import { ProfileEditorComponent } from '../components/profile-editor.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
@Component({
  selector: 'app-user-edit',
  imports: [
    UserHeadingComponent,
    ProfileEditorComponent,
    ProblemComponent,
    RouterLink,
  ],
  providers: [UserDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-problem [problem]="store.problem()" />
    @if (store.success()) {
      <p role="status" class="mb-5 rounded-xl bg-sage p-4 text-sm text-primary">
        {{ store.success() }}
      </p>
    }
    @if (store.loading()) {
      <p role="status" class="py-8 text-muted">Cargando perfil…</p>
    } @else if (store.user(); as user) {
      <app-user-heading [user]="user" />
      @if (user.status !== 'deleted') {
        <section
          class="mt-7 rounded-3xl border border-line bg-white p-6 sm:p-8"
        >
          <h2 class="mb-7 text-xl font-semibold">Editar perfil</h2>
          <app-profile-editor
            [user]="user"
            [busy]="store.busy() || store.refreshRequired()"
            (update)="
              store.execute({ kind: 'profile', userId: user.id, body: $event })
            "
          />
        </section>
      } @else {
        <p class="mt-7 text-muted">
          Las cuentas eliminadas no se pueden editar.
        </p>
      }
    } @else {
      <h1 class="text-2xl font-semibold">No pudimos cargar la cuenta</h1>
      <a
        routerLink="/usuarios"
        class="mt-4 inline-flex min-h-11 items-center text-primary"
        >Volver a usuarios</a
      >
    }`,
})
export class UserEditPage {
  readonly store = inject(UserDetailStore);
  readonly userId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('userId') ?? '')),
    { initialValue: '' },
  );
  constructor() {
    this.store.load(this.userId);
  }
}
