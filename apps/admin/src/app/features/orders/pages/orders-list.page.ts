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
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrdersListStore } from '../state/orders-list.store';
import { parseFilters, contextSchema } from '../mappers/orders.mapper';
import { statuses, statusLabel, orderMoney } from '../models/order';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-orders-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [OrdersListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders-list.page.html',
})
export class OrdersListPage {
  readonly store = inject(OrdersListStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly statuses = statuses;
  readonly statusLabel = statusLabel;
  readonly colombiaDateTime = colombiaDateTime;
  readonly orderMoney = orderMoney;
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
        Validators.pattern(/^(?:[^\p{Cc}]{2,100})?$/u),
      ],
    ],
    status: [''],
    limit: ['20'],
  });
  readonly orderId = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    Validators.pattern(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  ]);
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
          limit: String(q?.limit ?? 20),
        },
        { emitEvent: false },
      );
    });
  }
  searchOrders() {
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
    this.orderId.markAsTouched();
    const c = contextSchema.safeParse({
      organizationId: this.form.controls.organizationId.value,
      orderId: this.orderId.value.trim(),
    });
    if (c.success)
      void this.router.navigate([
        '/pedidos',
        c.data.organizationId,
        c.data.orderId,
      ]);
  }
}
