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
import { OrganizationsListStore } from '../state/organizations-list.store';
import { statuses, types, defaultFilters } from '../models/organization';
import { parseFilters, countryOptions } from '../mappers/organizations.mapper';
import { OrganizationBadgeComponent } from '../components/organization-badge.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-organizations-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    OrganizationBadgeComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [OrganizationsListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organizations-list.page.html',
})
export class OrganizationsListPage {
  readonly store = inject(OrganizationsListStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly statuses = statuses;
  readonly types = types;
  readonly countries = countryOptions;
  readonly filters = toSignal(
    this.route.queryParamMap.pipe(map(parseFilters)),
    { initialValue: defaultFilters },
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    search: [
      '',
      [Validators.maxLength(100), Validators.pattern(/^[^\p{Cc}]*$/u)],
    ],
    status: [''],
    type: [''],
    countryCode: [''],
    limit: ['20'],
  });
  constructor() {
    this.store.load(this.filters);
    effect(() => {
      const f = this.filters();
      this.form.patchValue(
        {
          search: f.search ?? '',
          status: f.status ?? '',
          type: f.type ?? '',
          countryCode: f.countryCode ?? '',
          limit: String(f.limit),
        },
        { emitEvent: false },
      );
    });
  }
  search() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...value,
        search: value.search.trim() || null,
        status: value.status || null,
        type: value.type || null,
        countryCode: value.countryCode || null,
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
