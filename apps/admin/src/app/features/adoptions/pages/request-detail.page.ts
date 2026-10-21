import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { RequestDetailStore } from '../state/request-detail.store';
import { requestContextSchema } from '../mappers/requests.mapper';
import {
  requestStatusLabel,
  type RequestCommand,
} from '../models/adoption-request';
import { auditLabels } from '../models/publication';
import { RequestDecisionComponent } from '../components/request-decision.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-request-detail',
  imports: [
    RouterLink,
    RequestDecisionComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [RequestDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-detail.page.html',
})
export class RequestDetailPage {
  readonly store = inject(RequestDetailStore);
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
        adoptionRequestId: p.get('adoptionRequestId'),
      });
    return r.success ? r.data : null;
  });
  readonly auditPage = computed(() => {
    const n = Number(this.query().get('page') ?? 1);
    return Number.isInteger(n) && n > 0 && n <= 100000 ? n : 1;
  });
  readonly auditQuery = computed(() => {
    const context = this.context(),
      d = this.store.detail();
    return context && d
      ? { context, page: this.auditPage(), revision: d.request.version }
      : null;
  });
  readonly label = requestStatusLabel;
  readonly date = colombiaDateTime;
  readonly auditLabels = auditLabels;
  constructor() {
    this.store.load(this.context);
    this.store.loadAudit(this.auditQuery);
  }
  refresh() {
    const c = this.context();
    if (c && !this.store.busy()) this.store.load(c);
  }
  execute(c: RequestCommand) {
    if (!this.store.busy() && !this.store.refreshRequired())
      this.store.execute(c);
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
}
