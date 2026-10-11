import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RequestsListStore } from '../state/requests-list.store';
import {
  requestContextSchema,
  requestFiltersSchema,
} from '../mappers/requests.mapper';
import {
  requestStatuses,
  requestStatusLabel,
} from '../models/adoption-request';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-requests-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [RequestsListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './requests-list.page.html',
})
export class RequestsListPage {
  readonly store = inject(RequestsListStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly context = computed(() => {
    const p = this.params(),
      r = requestContextSchema.safeParse({
        organizationId: p.get('organizationId'),
        publicationId: p.get('publicationId'),
      });
    return r.success ? r.data : null;
  });
  readonly filters = computed(() => {
    const c = this.context(),
      q = this.query();
    if (!c) return null;
    const r = requestFiltersSchema.safeParse({
      ...c,
      page: Number(q.get('page') ?? 1),
      limit: Number(q.get('limit') ?? 20),
      status: q.get('status') || undefined,
    });
    return r.success ? r.data : null;
  });
  readonly form = inject(FormBuilder).nonNullable.group({
    status: [this.route.snapshot.queryParamMap.get('status') ?? ''],
    limit: [this.route.snapshot.queryParamMap.get('limit') ?? '20'],
  });
  readonly statuses = requestStatuses;
  readonly label = requestStatusLabel;
  readonly date = colombiaDateTime;
  constructor() {
    this.store.load(this.filters);
    effect(() => {
      const q = this.query();
      this.form.reset({
        status: q.get('status') ?? '',
        limit: q.get('limit') ?? '20',
      });
    });
  }
  apply() {
    const v = this.form.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: v.status || null, limit: v.limit, page: 1 },
    });
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }
  refresh() {
    this.store.load(this.filters());
  }
}
