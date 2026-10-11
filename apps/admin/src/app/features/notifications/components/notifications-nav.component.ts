import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-notifications-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav
    aria-label="Secciones de notificaciones"
    class="mb-6 flex flex-wrap gap-3 text-sm"
  >
    <a
      routerLink="/notificaciones"
      [routerLinkActiveOptions]="{ exact: true }"
      routerLinkActive="bg-sage"
      ariaCurrentWhenActive="page"
      class="inline-flex min-h-11 items-center rounded-xl border border-line px-4 font-semibold text-primary"
      >Mi bandeja</a
    ><a
      routerLink="/notificaciones/preferencias"
      routerLinkActive="bg-sage"
      ariaCurrentWhenActive="page"
      class="inline-flex min-h-11 items-center rounded-xl border border-line px-4 font-semibold text-primary"
      >Preferencias de correo</a
    >
    @if (admin()) {
      <a
        routerLink="/notificaciones/entregas"
        routerLinkActive="bg-sage"
        ariaCurrentWhenActive="page"
        class="inline-flex min-h-11 items-center rounded-xl border border-line px-4 font-semibold text-primary"
        >Entregas fallidas</a
      >
    }
  </nav>`,
})
export class NotificationsNavComponent {
  readonly admin = input(false);
}
