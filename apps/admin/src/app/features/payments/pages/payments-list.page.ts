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
import { AUTH_SESSION } from '../../../core/auth';
import { PaymentsListStore } from '../state/payments-list.store';
import {
  parseFilters,
  querySchema,
  contextSchema,
} from '../mappers/payments.mapper';
import {
  statuses,
  statusLabel,
  distributionLabels,
  detailLink,
} from '../models/payment';
import {
  colombiaDateTime,
  moneyLabel,
} from '../../../shared/formatting/colombia';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-payments-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [PaymentsListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payments-list.page.html',
})
export class PaymentsListPage {
  readonly store = inject(PaymentsListStore);
  private readonly session = inject(AUTH_SESSION);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly platform = computed(
    () => this.session.identity()?.role === 'super_admin',
  );
  readonly statuses = statuses;
  readonly statusLabel = statusLabel;
  readonly distributionLabels = distributionLabels;
  readonly detailLink = detailLink;
  readonly money = moneyLabel;
  readonly date = colombiaDateTime;
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => parseFilters(this.params(), this.platform()));
  readonly invalidFilters = computed(
    () => !this.query() && this.params().keys.length > 0,
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    scope: [this.platform() ? 'platform' : 'business'],
    organizationId: [''],
    status: [''],
    limit: ['20'],
  });
  readonly paymentId = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    Validators.pattern(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  ]);
  readonly companySearch = inject(FormBuilder).nonNullable.control('', [
    Validators.maxLength(100),
    Validators.pattern(/^[^\p{Cc}]*$/u),
  ]);
  readonly selectedScope = toSignal(this.form.controls.scope.valueChanges, {
    initialValue: this.form.controls.scope.value,
  });
  private readonly search = toSignal(
    this.companySearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
  readonly companyRequest = computed(() => {
    const q = this.query();
    return {
      search: this.search(),
      currentId: q?.scope === 'business' ? q.organizationId : undefined,
    };
  });
  constructor() {
    this.store.load(this.query);
    this.store.findCompanies(this.companyRequest);
    effect(() => {
      const q = this.query();
      this.form.patchValue({
        scope: q?.scope ?? (this.platform() ? 'platform' : 'business'),
        organizationId: q?.scope === 'business' ? q.organizationId : '',
        status: q?.status ?? '',
        limit: String(q?.limit ?? 20),
      });
    });
  }
  searchPayments() {
    const v = this.form.getRawValue();
    const p = querySchema.safeParse({
      ...(v.scope === 'platform'
        ? { scope: v.scope }
        : { scope: v.scope, organizationId: v.organizationId }),
      status: v.status || undefined,
      page: 1,
      limit: Number(v.limit),
    });
    if (!p.success || (v.scope === 'platform' && !this.platform())) {
      this.form.controls.organizationId.setErrors({ required: true });
      this.form.markAllAsTouched();
      this.element.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: p.data,
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
    this.paymentId.markAsTouched();
    const q = this.query();
    if (!q) return;
    const p = contextSchema.safeParse({
      ...(q.scope === 'platform'
        ? { scope: q.scope }
        : { scope: q.scope, organizationId: q.organizationId }),
      paymentId: this.paymentId.value.trim(),
    });
    if (p.success)
      void this.router.navigate(
        p.data.scope === 'platform'
          ? ['/pagos', 'plataforma', p.data.paymentId]
          : ['/pagos', 'empresa', p.data.organizationId, p.data.paymentId],
      );
  }
}
