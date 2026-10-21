import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { Organization } from '../models/organization';
import { OrganizationBadgeComponent } from './organization-badge.component';
@Component({
  selector: 'app-organization-heading',
  imports: [RouterLink, RouterLinkActive, OrganizationBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <a
      routerLink="/organizaciones"
      class="inline-flex min-h-11 items-center text-sm font-medium text-primary"
      >← Volver a organizaciones</a
    >
    <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-xs font-semibold text-primary">
          {{ organization().typeLabel }}
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight break-words">
          {{ organization().name }}
        </h1>
        <p class="mt-3 text-xs text-muted">
          Versión {{ organization().version }}
        </p>
      </div>
      <app-organization-badge [organization]="organization()" />
    </div>
    <nav
      class="mt-7 flex flex-wrap gap-2 border-b border-line pb-5"
      aria-label="Secciones de la organización"
    >
      <a
        [routerLink]="['/organizaciones', organization().id]"
        routerLinkActive="nav-current"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
        class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium"
        >Detalle</a
      >
      @if (organization().status !== 'deleted') {
        <a
          [routerLink]="['/organizaciones', organization().id, 'editar']"
          routerLinkActive="nav-current"
          ariaCurrentWhenActive="page"
          class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium"
          >Editar perfil</a
        ><a
          [routerLink]="['/organizaciones', organization().id, 'revision']"
          routerLinkActive="nav-current"
          ariaCurrentWhenActive="page"
          class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium"
          >Revisión y estado</a
        >
      }
      <a
        [routerLink]="['/organizaciones', organization().id, 'miembros']"
        routerLinkActive="nav-current"
        ariaCurrentWhenActive="page"
        class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium"
        >Miembros</a
      ><a
        [routerLink]="['/organizaciones', organization().id, 'auditoria']"
        routerLinkActive="nav-current"
        ariaCurrentWhenActive="page"
        class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium"
        >Auditoría</a
      >
    </nav>`,
})
export class OrganizationHeadingComponent {
  readonly organization = input.required<Organization>();
}
