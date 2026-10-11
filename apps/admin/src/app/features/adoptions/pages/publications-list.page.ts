import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PublicationsListStore } from '../state/publications-list.store';
import { filtersSchema, contextSchema } from '../mappers/publications.mapper';
import { statuses, statusLabel } from '../models/publication';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { AUTH_SESSION } from '../../../core/auth';
@Component({
  selector: 'app-publications-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [PublicationsListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publications-list.page.html',
})
export class PublicationsListPage {
  readonly store = inject(PublicationsListStore);
  readonly session = inject(AUTH_SESSION);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly review = this.route.snapshot.data['review'] === true;
  readonly statuses = statuses;
  readonly statusLabel = statusLabel;
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => {
    const p = this.params();
    const r = filtersSchema.safeParse({
      review: this.review,
      organizationId: p.get('organizationId') || undefined,
      status: p.get('status') || undefined,
      page: Number(p.get('page') ?? 1),
      limit: Number(p.get('limit') ?? 20),
    });
    return r.success ? r.data : null;
  });
  readonly form = inject(FormBuilder).nonNullable.group({
    organizationId: ['', Validators.required],
    status: [''],
    limit: ['20'],
  });
  readonly publicationId = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    Validators.pattern(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  ]);
  readonly lookupForm = inject(FormBuilder).nonNullable.group({
    publicationId: this.publicationId,
  });
  readonly shelterSearch = inject(FormBuilder).nonNullable.control('', [
    Validators.maxLength(100),
    Validators.pattern(/^[^\p{Cc}]*$/u),
  ]);
  private readonly search = toSignal(
    this.shelterSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
  constructor() {
    this.store.load(this.query);
    if (!this.review)
      this.store.findShelters(
        computed(() => ({
          search: this.search(),
          currentId: this.query()?.organizationId,
        })),
      );
    effect(() => {
      const q = this.query();
      this.form.patchValue(
        {
          organizationId: q?.organizationId ?? '',
          status: q?.status ?? '',
          limit: String(q?.limit ?? 20),
        },
        { emitEvent: false },
      );
    });
  }
  searchPublications() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        organizationId: v.organizationId,
        status: v.status || null,
        limit: v.limit,
        page: 1,
      },
    });
  }
  page(page: number) {
    const q = this.query();
    if (q)
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          organizationId: q.organizationId,
          status: q.status,
          limit: q.limit,
          page,
        },
      });
  }
  refresh() {
    if (!this.store.loading()) this.store.load(this.query());
  }
  open() {
    this.publicationId.markAsTouched();
    const q = this.query(),
      c = contextSchema.safeParse({
        publicationId: this.publicationId.value.trim(),
        organizationId: q?.organizationId,
        review: this.review,
      });
    if (c.success)
      void this.router.navigate(
        this.review
          ? ['/adopciones/revision', c.data.publicationId]
          : ['/adopciones', c.data.organizationId, c.data.publicationId],
      );
  }
}
