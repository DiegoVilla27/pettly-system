import {
  ChangeDetectionStrategy,
  Component,
  inject,
  effect,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UsersListStore } from '../state/users-list.store';
import { defaultFilters, globalRoles, membershipRoles } from '../models/user';
import { parseFilters } from '../mappers/users.mapper';
import { UserBadgeComponent } from '../components/user-badge.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-users-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UserBadgeComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [UsersListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-list.page.html',
})
export class UsersListPage {
  readonly store = inject(UsersListStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly roles = globalRoles;
  readonly organizationRoles = membershipRoles;
  readonly filters = toSignal(
    this.route.queryParamMap.pipe(map(parseFilters)),
    { initialValue: defaultFilters },
  );
  readonly form = this.fb.group({
    search: [
      '',
      [Validators.maxLength(100), Validators.pattern(/^[^\p{Cc}]*$/u)],
    ],
    status: [''],
    role: [''],
    organizationRole: [''],
    emailVerified: [''],
    limit: ['20'],
    sort: ['createdAt:desc'],
  });
  constructor() {
    this.store.load(this.filters);
    effect(() => {
      const f = this.filters();
      this.form.patchValue(
        {
          search: f.search ?? '',
          status: f.status ?? '',
          role: f.role ?? '',
          organizationRole: f.organizationRole ?? '',
          emailVerified: f.emailVerified ?? '',
          limit: String(f.limit),
          sort: f.sortBy + ':' + f.sortOrder,
        },
        { emitEvent: false },
      );
    });
  }
  search() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const values = this.form.getRawValue(),
      [sortBy, sortOrder] = values.sort.split(':');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...values,
        search: values.search.trim() || null,
        sort: null,
        sortBy,
        sortOrder,
        page: 1,
      },
    });
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.filters(), page },
    });
  }
  clear() {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
}
