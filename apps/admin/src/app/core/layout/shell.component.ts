import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AUTH_SESSION } from '../auth';
import { toApiProblem, type ApiProblem } from '../api';
import { BrandComponent } from '../../shared/ui/brand.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { ProblemComponent } from '../../shared/ui/problem.component';
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BrandComponent,
    IconComponent,
    ProblemComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  readonly session = inject(AUTH_SESSION);
  readonly canManageAdoptions = computed(
    () =>
      this.session.hasPermission('moderation.publications.review') ||
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.status === 'active' &&
            o.type === 'adoption_entity' &&
            o.permissions.includes('adoptions.publications.manage'),
        ),
  );
  readonly canManageAnimals = computed(
    () =>
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.status === 'active' &&
            o.type === 'adoption_entity' &&
            o.permissions.includes('animals.manage'),
        ),
  );
  readonly canReadPayments = computed(
    () =>
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.status === 'active' &&
            o.type === 'business' &&
            o.permissions.includes('payments.business.read'),
        ),
  );
  readonly canManageOrders = computed(
    () =>
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.status === 'active' &&
            o.type === 'business' &&
            o.permissions.includes('orders.fulfillment.manage'),
        ),
  );
  readonly canManageBookings = computed(
    () =>
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.status === 'active' &&
            o.type === 'business' &&
            o.permissions.includes('bookings.manage'),
        ),
  );
  readonly canUseServices = computed(
    () =>
      this.session.hasPermission('moderation.publications.review') ||
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.status === 'active' &&
            o.type === 'business' &&
            o.permissions.includes('services.manage'),
        ),
  );
  readonly canManageInventory = computed(
    () =>
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.status === 'active' &&
            o.type === 'business' &&
            o.permissions.includes('inventory.manage'),
        ),
  );
  readonly canManageProducts = computed(
    () =>
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.status === 'active' &&
            o.type === 'business' &&
            o.permissions.includes('catalog.manage'),
        ),
  );
  readonly canUseVeterinary = computed(
    () =>
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.type === 'business' &&
            o.status === 'active' &&
            o.permissions.includes('services.manage'),
        ),
  );
  readonly canConfigureCommercial = computed(
    () =>
      this.session.identity()?.role === 'super_admin' ||
      this.session
        .identity()
        ?.organizations.some(
          (o) =>
            o.type === 'business' &&
            o.status === 'active' &&
            o.permissions.includes('orders.settings.manage'),
        ),
  );
  readonly expanded = signal(false);
  readonly error = signal<ApiProblem | null>(null);
  async logout() {
    this.error.set(null);
    try {
      await this.session.logout();
    } catch (error) {
      this.error.set(toApiProblem(error));
    }
  }
}
