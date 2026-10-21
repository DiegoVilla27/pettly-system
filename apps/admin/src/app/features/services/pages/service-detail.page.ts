import { signal as pickerSignal } from '@angular/core';
import { rxResource as pickerResource } from '@angular/core/rxjs-interop';
import { SERVICES_GATEWAY } from '../models/services-gateway';
import { toApiProblem } from '../../../core/api';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import { ServiceAvailabilityComponent } from '../components/service-availability.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AUTH_SESSION } from '../../../core/auth';
import { ServiceDetailStore } from '../state/service-detail.store';
import { ServiceEditorComponent } from '../components/service-editor.component';
import { ServiceDecisionComponent } from '../components/service-decision.component';
import {
  statusLabel,
  categoryLabel,
  moneyLabel,
  species,
  type ServiceContext,
  type ServiceProfile,
  type DecisionAction,
  type DecisionBody,
} from '../models/service';
import { timeFromMinute } from '../mappers/services.mapper';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-service-detail',
  imports: [
    RouterLink,
    ServiceAvailabilityComponent,
    DatePipe,
    ServiceEditorComponent,
    ServiceDecisionComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [ServiceDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-detail.page.html',
})
export class ServiceDetailPage {
  readonly store = inject(ServiceDetailStore);
  private readonly pickerGateway = inject(SERVICES_GATEWAY);
  readonly professionalPage = pickerSignal(1);
  readonly toProblem = toApiProblem;
  readonly professionals = pickerResource({
    params: () => {
      const organizationId = !this.review
        ? this.store.service()?.organizationId
        : undefined;
      return organizationId
        ? { organizationId, page: this.professionalPage() }
        : undefined;
    },
    stream: ({ params }) =>
      this.pickerGateway.eligible(params.organizationId, params.page),
  });

  readonly session = inject(AUTH_SESSION);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly review = this.route.snapshot.data['review'] === true;
  readonly editing = signal(false);
  readonly statusLabel = statusLabel;
  readonly categoryLabel = categoryLabel;
  readonly moneyLabel = moneyLabel;
  readonly timeFromMinute = timeFromMinute;
  readonly context = toSignal(
    this.route.paramMap.pipe(
      map(
        (p) =>
          ({
            id: p.get('serviceId') ?? '',
            organizationId: p.get('organizationId') ?? '',
            review: this.review,
          }) satisfies ServiceContext,
      ),
    ),
    { initialValue: null },
  );
  readonly auditPage = toSignal(
    this.route.queryParamMap.pipe(
      map((p) => {
        const n = Number(p.get('page') ?? 1);
        return Number.isInteger(n) && n > 0 && n <= 10000 ? n : 1;
      }),
    ),
    { initialValue: 1 },
  );
  readonly resourceRequest = computed(() =>
    !this.review ? (this.store.service()?.organizationId ?? null) : null,
  );
  readonly auditRequest = computed(() => {
    const s = this.store.service(),
      context = this.context();
    return s && context && !this.review
      ? { context, page: this.auditPage(), version: s.version }
      : null;
  });
  readonly blockedReviewer = computed(() => {
    const s = this.store.service(),
      u = this.session.identity();
    return (
      !s ||
      !u ||
      s.createdBy === u.id ||
      u.organizations.some((o) => o.organizationId === s.organizationId)
    );
  });
  readonly speciesLabels = computed(() =>
    this.store
      .service()
      ?.acceptedSpecies.map(
        (v) => species.find((s) => s.value === v)?.label ?? v,
      )
      .join(', '),
  );
  readonly resourceLabels = computed(
    () =>
      this.store
        .service()
        ?.resourceIds.map(
          (id) => this.store.resources().find((r) => r.id === id)?.name ?? id,
        ) ?? [],
  );
  readonly actionLabels: Record<string, string> = {
    created: 'Creación',
    updated: 'Edición',
    submit: 'Envío a revisión',
    review: 'Revisión',
    pause: 'Pausa',
    archive: 'Archivo definitivo',
  };
  constructor() {
    this.store.load(this.context);
    this.store.loadResources(this.resourceRequest);
    this.store.loadAudit(this.auditRequest);
    effect(() => {
      this.context();
      this.editing.set(false);
    });
    effect(() => {
      if (this.store.success()) this.editing.set(false);
    });
  }
  refresh() {
    if (!this.store.busy()) {
      const c = this.context();
      if (c) this.store.load(c);
      this.editing.set(false);
    }
  }
  update(value: { profile: ServiceProfile; reason: string }) {
    const s = this.store.service();
    if (
      s &&
      !this.store.busy() &&
      !this.store.refreshRequired() &&
      !this.review
    )
      this.store.execute({
        kind: 'update',
        id: s.id,
        body: {
          organizationId: s.organizationId,
          expectedVersion: s.version,
          ...value,
        },
      });
  }
  decide(value: { action: DecisionAction; body: DecisionBody }) {
    const s = this.store.service();
    if (
      s &&
      !this.store.busy() &&
      !this.store.refreshRequired() &&
      (!this.review || !this.blockedReviewer())
    )
      this.store.execute({
        kind: value.action,
        id: s.id,
        organizationId: s.organizationId,
        body: value.body,
      });
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
}
