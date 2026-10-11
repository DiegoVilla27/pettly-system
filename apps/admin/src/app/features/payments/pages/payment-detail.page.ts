import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AUTH_SESSION } from '../../../core/auth';
import { PaymentDetailStore } from '../state/payment-detail.store';
import { contextSchema } from '../mappers/payments.mapper';
import { statusLabel, type PaymentContext } from '../models/payment';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { PaymentSnapshotComponent } from '../components/payment-snapshot.component';
import { PaymentEvidenceComponent } from '../components/payment-evidence.component';
@Component({
  selector: 'app-payment-detail',
  imports: [
    RouterLink,
    ProblemComponent,
    PaginationComponent,
    PaymentSnapshotComponent,
    PaymentEvidenceComponent,
  ],
  providers: [PaymentDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-detail.page.html',
})
export class PaymentDetailPage {
  readonly store = inject(PaymentDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AUTH_SESSION);
  readonly platform = computed(
    () => this.session.identity()?.role === 'super_admin',
  );
  readonly date = colombiaDateTime;
  readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly context = computed<PaymentContext | null>(() => {
    const p = this.params();
    const c = contextSchema.safeParse(
      p.has('organizationId')
        ? {
            scope: 'business',
            organizationId: p.get('organizationId'),
            paymentId: p.get('paymentId'),
          }
        : { scope: 'platform', paymentId: p.get('paymentId') },
    );
    return c.success ? c.data : null;
  });
  readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly historyPage = computed(() => {
    const n = Number(this.queryParams().get('page') ?? 1);
    return Number.isInteger(n) && n > 0 && n <= 10000 ? n : 1;
  });
  readonly historyRequest = computed(() => {
    const c = this.context(),
      p = this.store.payment();
    return c && p
      ? { context: c, page: this.historyPage(), version: p.version }
      : null;
  });
  readonly showEvidence = signal(false);
  readonly confirm = signal(false);
  readonly evidenceRequest = computed(() =>
    this.platform() && this.showEvidence() && this.store.payment()
      ? this.context()
      : null,
  );
  readonly reconcileAvailable = computed(() => {
    const p = this.store.payment(),
      policy = this.store.policy();
    return (
      this.platform() &&
      !!p &&
      !!policy?.providerEnabled &&
      policy.provider === p.provider &&
      !this.store.loading() &&
      !this.store.busy() &&
      !this.store.refreshRequired()
    );
  });
  readonly backQuery = computed(() => {
    const c = this.context();
    return c?.scope === 'business'
      ? { scope: 'business', organizationId: c.organizationId }
      : { scope: 'platform' };
  });
  constructor() {
    this.store.load(this.context);
    this.store.loadHistory(this.historyRequest);
    this.store.loadEvidence(this.evidenceRequest);
    effect(() => {
      this.context();
      this.confirm.set(false);
      this.showEvidence.set(false);
    });
  }
  refresh() {
    const c = this.context();
    if (c && !this.store.busy()) {
      this.confirm.set(false);
      this.store.load(c);
    }
  }
  reconcile() {
    const c = this.context();
    if (c && this.confirm() && this.reconcileAvailable()) {
      this.confirm.set(false);
      this.store.reconcile(c);
    }
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
  historyLabel(action: string) {
    return action === 'reconciliation_requested'
      ? 'Consulta de conciliación solicitada'
      : [
            'created',
            'processing',
            'pending',
            'approved',
            'declined',
            'cancelled',
            'expired',
            'reconciliation_required',
          ].includes(action)
        ? statusLabel(action as Parameters<typeof statusLabel>[0])
        : action;
  }
}
