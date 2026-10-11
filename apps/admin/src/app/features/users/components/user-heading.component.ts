import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { User } from '../models/user';
import { UserBadgeComponent } from './user-badge.component';
@Component({
  selector: 'app-user-heading',
  imports: [RouterLink, RouterLinkActive, UserBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/usuarios"
      class="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >← Volver a usuarios</a
    >
    <div class="mt-4 flex flex-wrap items-center justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-3xl font-semibold tracking-tight break-words">
          {{ user().fullName }}
        </h1>
        <p class="mt-3 text-sm break-all text-muted">{{ user().email }}</p>
      </div>
      <app-user-badge [user]="user()" />
    </div>
    <nav
      class="mt-7 flex flex-wrap gap-2 border-b border-line pb-5"
      aria-label="Secciones del usuario"
    >
      <a
        [routerLink]="['/usuarios', user().id]"
        routerLinkActive="nav-current"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
        class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium"
        >Detalle</a
      >
      @if (user().status !== 'deleted') {
        <a
          [routerLink]="['/usuarios', user().id, 'editar']"
          routerLinkActive="nav-current"
          ariaCurrentWhenActive="page"
          class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium"
          >Editar perfil</a
        >
      }
      <a
        [routerLink]="['/usuarios', user().id, 'acceso']"
        routerLinkActive="nav-current"
        ariaCurrentWhenActive="page"
        class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium"
        >Acceso y roles</a
      ><a
        [routerLink]="['/usuarios', user().id, 'auditoria']"
        routerLinkActive="nav-current"
        ariaCurrentWhenActive="page"
        class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium"
        >Auditoría</a
      >
    </nav>`,
})
export class UserHeadingComponent {
  readonly user = input.required<User>();
}
