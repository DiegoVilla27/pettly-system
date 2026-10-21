import { inject } from '@angular/core';
import { AUTH_SESSION } from '../../../core/auth';
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { Credential } from '../models/credential';
import { CredentialBadgeComponent } from './credential-badge.component';
@Component({
  selector: 'app-credential-heading',
  imports: [RouterLink, RouterLinkActive, CredentialBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <a
      routerLink="/veterinaria"
      class="text-sm font-medium text-primary hover:underline"
      >← Volver a acreditaciones</a
    >
    <div class="mt-5 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-3xl font-semibold tracking-tight">
          Matrícula {{ credential().registrationNumber }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{ credential().professionLabel }} · Versión
          {{ credential().version }}
        </p>
      </div>
      <app-credential-badge [credential]="credential()" />
    </div>
    <nav
      aria-label="Secciones de acreditación"
      class="mt-6 flex flex-wrap gap-2 border-b border-line pb-4"
    >
      <a
        [routerLink]="['/veterinaria', credential().id]"
        [routerLinkActiveOptions]="{ exact: true }"
        routerLinkActive="nav-current"
        ariaCurrentWhenActive="page"
        class="min-h-11 rounded-xl px-4 py-3 text-sm font-medium"
        >Datos y evidencias</a
      >
      <a
        [routerLink]="['/veterinaria', credential().id, 'preparar']"
        class="min-h-11 rounded-xl px-4 py-3 text-sm font-medium"
        >Preparar perfil y evidencias</a
      >
      @if (session.identity()?.role === 'super_admin') {
        <a
          [routerLink]="['/veterinaria', credential().id, 'revision']"
          routerLinkActive="nav-current"
          ariaCurrentWhenActive="page"
          class="min-h-11 rounded-xl px-4 py-3 text-sm font-medium"
          >Revisión y estado</a
        >
      }
      <a
        [routerLink]="['/veterinaria', credential().id, 'auditoria']"
        routerLinkActive="nav-current"
        ariaCurrentWhenActive="page"
        class="min-h-11 rounded-xl px-4 py-3 text-sm font-medium"
        >Auditoría</a
      >
    </nav>`,
})
export class CredentialHeadingComponent {
  readonly session = inject(AUTH_SESSION);
  readonly credential = input.required<Credential>();
}
