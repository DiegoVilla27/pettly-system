import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  effect,
  ElementRef,
  afterRenderEffect,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer, map } from 'rxjs';
import { DeliveriesStore } from '../state/deliveries.store';
import { parseDeliveryFilters } from '../mappers/notifications.mapper';
import {
  retryCandidate,
  failureLabel,
  type Delivery,
} from '../models/notification';
import { NotificationsNavComponent } from '../components/notifications-nav.component';
import { DeliveryRetryComponent } from '../components/delivery-retry.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-notification-deliveries',
  imports: [
    NotificationsNavComponent,
    DeliveryRetryComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [DeliveriesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deliveries.page.html',
})
export class DeliveriesPage {
  readonly store = inject(DeliveriesStore);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => parseDeliveryFilters(this.params()));
  readonly selection = signal<string | null>(null);
  readonly selected = computed(
    () => this.store.items().find((d) => d.id === this.selection()) ?? null,
  );
  readonly now = toSignal(timer(0, 15000).pipe(map(() => Date.now())), {
    initialValue: Date.now(),
  });
  readonly date = colombiaDateTime;
  readonly failureLabel = failureLabel;
  readonly retryCandidate = retryCandidate;
  constructor() {
    afterRenderEffect(() => {
      if (this.store.receipt())
        this.element.nativeElement
          .querySelector<HTMLElement>('#retry-receipt')
          ?.focus();
    });
    this.store.load(this.query);
    effect(() => {
      const q = this.query();
      if (q) this.selection.set(null);
    });
  }
  choose(d: Delivery) {
    if (
      !this.store.busy() &&
      !this.store.refreshRequired() &&
      !this.store.receipt()
    )
      this.selection.set(d.id);
  }
  refresh() {
    if (!this.store.busy()) {
      this.selection.set(null);
      this.store.load(this.query());
    }
  }
  page(page: number) {
    if (!this.store.busy())
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ...this.query(), page },
      });
  }
}
