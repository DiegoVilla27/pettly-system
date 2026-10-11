import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AUTH_SESSION } from '../../../core/auth';
import { IconComponent } from '../../../shared/ui/icon.component';
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
})
export class HomePage {
  readonly session = inject(AUTH_SESSION);
  readonly canReviewProducts = computed(() =>
    this.session.hasPermission('moderation.publications.review'),
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
  readonly canManageUsers = computed(() =>
    this.session.hasPermission('users.status.update'),
  );
  readonly canReviewOrganizations = computed(() =>
    this.session.hasPermission('organizations.review'),
  );
}
