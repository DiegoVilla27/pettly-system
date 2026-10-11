import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  ElementRef,
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AUTH_SESSION } from '../../../core/auth';
import { ServicesListStore } from '../state/services-list.store';
import { parseFilters } from '../mappers/services.mapper';
import {
  statuses,
  categories,
  statusLabel,
  categoryLabel,
  moneyLabel,
} from '../models/service';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-services-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [ServicesListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services-list.page.html',
})
export class ServicesListPage {
  readonly store = inject(ServicesListStore);
  readonly session = inject(AUTH_SESSION);
  readonly statuses = statuses;
  readonly categories = categories;
  readonly statusLabel = statusLabel;
  readonly categoryLabel = categoryLabel;
  readonly moneyLabel = moneyLabel;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly review = this.route.snapshot.data['review'] === true;
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => parseFilters(this.params()));
  readonly reviewQuery = computed(() => {
    const p = Number(this.params().get('page') ?? 1);
    return {
      page: Number.isInteger(p) && p > 0 && p <= 10000 ? p : 1,
      limit: 20,
    };
  });
  readonly request = computed(() => {
    const query = this.query();
    return this.review
      ? { query: this.reviewQuery(), review: true }
      : query
        ? { query, review: false }
        : null;
  });
  readonly form = inject(FormBuilder).nonNullable.group({
    organizationId: ['', Validators.required],
    search: [
      '',
      [
        Validators.maxLength(100),
        Validators.pattern(/^(?:[^\p{Cc}]{2,100})?$/u),
      ],
    ],
    status: [''],
    category: [''],
    limit: ['20'],
  });
  readonly companySearch = inject(FormBuilder).nonNullable.control('', [
    Validators.maxLength(100),
    Validators.pattern(/^[^\p{Cc}]*$/u),
  ]);
  private readonly search = toSignal(
    this.companySearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
  readonly companyRequest = computed(() => ({
    search: this.search(),
    currentId: this.query()?.organizationId,
  }));
  constructor() {
    this.store.load(this.request);
    if (!this.review) this.store.findCompanies(this.companyRequest);
    effect(() => {
      const q = this.query();
      this.form.patchValue(
        {
          organizationId: q?.organizationId ?? '',
          search: q?.search ?? '',
          category: q?.category ?? '',
          status: q?.status ?? '',
          limit: String(q?.limit ?? 20),
        },
        { emitEvent: false },
      );
    });
  }
  searchServices() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const key = Object.entries(this.form.controls).find(
        ([, c]) => c.invalid,
      )?.[0];
      this.element.nativeElement
        .querySelector<HTMLElement>(`[formcontrolname="${key}"]`)
        ?.focus();
      return;
    }
    const v = this.form.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        organizationId: v.organizationId,
        search: v.search.trim() || null,
        category: v.category || null,
        status: v.status || null,
        limit: v.limit,
        page: 1,
      },
    });
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.review ? { page } : { ...this.query(), page },
    });
  }
}
