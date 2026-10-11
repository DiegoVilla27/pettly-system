import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PRODUCTS_GATEWAY } from '../models/products-gateway';
import { ProductsListStore } from '../state/products-list.store';
import { parseFilters, contextSchema } from '../mappers/products.mapper';
import { statuses, statusLabel } from '../models/product';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-products-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [ProductsListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products-list.page.html',
})
export class ProductsListPage {
  readonly store = inject(ProductsListStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly gateway = inject(PRODUCTS_GATEWAY);
  readonly categories = rxResource({ stream: () => this.gateway.categories() });
  readonly statuses = statuses;
  readonly statusLabel = statusLabel;
  readonly colombiaDateTime = colombiaDateTime;
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => parseFilters(this.params()));
  readonly invalidFilters = computed(
    () => this.params().has('organizationId') && !this.query(),
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    organizationId: ['', Validators.required],
    search: [
      '',
      [
        Validators.maxLength(100),
        Validators.pattern(/^(?:[^\p{Cc}]{1,100})?$/u),
      ],
    ],
    status: [''],
    categoryId: [''],
    limit: ['20'],
  });
  readonly productId = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    Validators.pattern(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  ]);
  readonly lookupForm = inject(FormBuilder).nonNullable.group({
    productId: this.productId,
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
    this.store.load(this.query);
    this.store.findCompanies(this.companyRequest);
    effect(() => {
      const q = this.query();
      this.form.patchValue(
        {
          organizationId: q?.organizationId ?? '',
          search: q?.search ?? '',
          status: q?.status ?? '',
          categoryId: q?.categoryId ?? '',
          limit: String(q?.limit ?? 20),
        },
        { emitEvent: false },
      );
    });
  }
  searchProducts() {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        organizationId: v.organizationId,
        search: v.search.trim() || null,
        status: v.status || null,
        categoryId: v.categoryId || null,
        limit: v.limit,
        page: 1,
      },
    });
  }
  refresh() {
    const q = this.query();
    if (q && !this.store.loading()) this.store.load(q);
  }
  page(page: number) {
    const q = this.query();
    if (q)
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ...q, page },
      });
  }
  open() {
    this.productId.markAsTouched();
    const c = contextSchema.safeParse({
      organizationId: this.query()?.organizationId,
      productId: this.productId.value.trim(),
    });
    if (c.success)
      void this.router.navigate([
        '/productos',
        c.data.organizationId,
        c.data.productId,
      ]);
  }
}
