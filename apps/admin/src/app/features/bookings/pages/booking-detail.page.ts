import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, timer } from 'rxjs';
import { BookingDetailStore } from '../state/booking-detail.store';
import { BookingAcceptanceComponent } from '../components/booking-acceptance.component';
import { BookingDecisionComponent } from '../components/booking-decision.component';
import {
  statusLabel,
  historyLabels,
  type BookingContext,
  type BookingAction,
  type DecisionBody,
} from '../models/booking';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-booking-detail',
  imports: [
    RouterLink,
    BookingAcceptanceComponent,
    BookingDecisionComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [BookingDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-detail.page.html',
})
export class BookingDetailPage {
  readonly store = inject(BookingDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly statusLabel = statusLabel;
  readonly historyLabels = historyLabels;
  readonly colombiaDateTime = colombiaDateTime;
  readonly now = toSignal(timer(0, 15000).pipe(map(() => Date.now())), {
    initialValue: Date.now(),
  });
  readonly context = toSignal(
    this.route.paramMap.pipe(
      map(
        (p) =>
          ({
            organizationId: p.get('organizationId') ?? '',
            bookingId: p.get('bookingId') ?? '',
          }) satisfies BookingContext,
      ),
    ),
    { initialValue: null },
  );
  readonly auditPage = toSignal(
    this.route.queryParamMap.pipe(
      map((p) => {
        const n = Number(p.get('page') ?? 1);
        return Number.isInteger(n) && n > 0 && n <= 10000 ? n : 1;
      }),
    ),
    { initialValue: 1 },
  );
  readonly auditRequest = computed(() => {
    const c = this.context(),
      b = this.store.booking();
    return c && b
      ? { context: c, page: this.auditPage(), version: b.version }
      : null;
  });
  readonly deadlineElapsed = computed(() => {
    const b = this.store.booking();
    return (
      b?.status === 'requested' &&
      !!b.expiresAt &&
      Date.parse(b.expiresAt) <= this.now()
    );
  });
  constructor() {
    this.store.load(this.context);
    this.store.loadAudit(this.auditRequest);
  }
  refresh() {
    const c = this.context();
    if (c && !this.store.busy()) this.store.load(c);
  }
  decide(value: { action: BookingAction; body: DecisionBody }) {
    const c = this.context();
    if (
      c &&
      this.store.booking() &&
      !this.store.busy() &&
      !this.store.refreshRequired()
    )
      this.store.execute({ context: c, ...value });
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
}
