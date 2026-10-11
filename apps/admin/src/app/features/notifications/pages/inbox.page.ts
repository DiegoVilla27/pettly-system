import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AUTH_SESSION } from '../../../core/auth';
import { InboxStore } from '../state/inbox.store';
import { categories } from '../models/notification';
import { parseInboxFilters } from '../mappers/notifications.mapper';
import { NoticeCardComponent } from '../components/notice-card.component';
import { NotificationsNavComponent } from '../components/notifications-nav.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-notifications-inbox',
  imports: [
    ReactiveFormsModule,
    NoticeCardComponent,
    NotificationsNavComponent,
    PaginationComponent,
    ProblemComponent,
  ],
  providers: [InboxStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inbox.page.html',
})
export class InboxPage {
  readonly store = inject(InboxStore);
  readonly session = inject(AUTH_SESSION);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly categories = categories;
  readonly date = colombiaDateTime;
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => parseInboxFilters(this.params()));
  readonly form = inject(FormBuilder).nonNullable.group({
    category: '',
    unreadOnly: false,
    limit: '20',
  });
  readonly bulkConfirmed = inject(FormBuilder).nonNullable.control(false);
  readonly pendingLabel = computed(() =>
    this.store.loading()
      ? 'Consultando pendientes…'
      : this.store.problem()
        ? 'Pendientes no disponibles'
        : `${this.store.count()} notificaciones sin leer`,
  );
  readonly cutoff = computed(() =>
    this.store
      .entities()
      .reduce((latest, n) => (n.createdAt > latest ? n.createdAt : latest), ''),
  );
  constructor() {
    this.store.load(this.query);
    effect(() => {
      const q = this.query();
      this.form.reset({
        category: q?.category ?? '',
        unreadOnly: q?.unreadOnly === 'true',
        limit: String(q?.limit ?? 20),
      });
      this.bulkConfirmed.reset();
    });
  }
  search() {
    if (this.store.busy()) return;
    const v = this.form.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: v.category || null,
        unreadOnly: v.unreadOnly ? 'true' : 'false',
        limit: v.limit,
        page: 1,
      },
    });
  }
  page(page: number) {
    if (!this.store.busy())
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ...this.query(), page },
      });
  }
  refresh() {
    if (!this.store.busy()) this.store.load(this.query());
  }
  read(id: string) {
    if (!this.store.busy()) this.store.write({ id });
  }
  readAll() {
    const through = this.cutoff();
    if (through && this.bulkConfirmed.value && !this.store.busy()) {
      this.store.write({ through });
      this.bulkConfirmed.reset();
    }
  }
}
