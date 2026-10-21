import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { PublicationDetailStore } from '../state/publication-detail.store';
import { PUBLICATIONS_GATEWAY } from '../models/publications-gateway';
import { AUTH_SESSION } from '../../../core/auth';
import { PublicationSnapshotComponent } from '../components/publication-snapshot.component';
import { contextSchema } from '../mappers/publications.mapper';
import { PublicationFormComponent } from '../components/publication-form.component';
import { PublicationDecisionComponent } from '../components/publication-decision.component';
import { PrivateImageComponent } from '../../../shared/ui/private-image.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
import { toApiProblem } from '../../../core/api';
import {
  statusLabel,
  auditLabels,
  type Profile,
  type Command,
  type Context,
} from '../models/publication';
@Component({
  selector: 'app-publication-detail',
  imports: [
    RouterLink,
    PublicationSnapshotComponent,
    PublicationFormComponent,
    PublicationDecisionComponent,
    PrivateImageComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [PublicationDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publication-detail.page.html',
})
export class PublicationDetailPage {
  readonly store = inject(PublicationDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gateway = inject(PUBLICATIONS_GATEWAY);
  readonly session = inject(AUTH_SESSION);
  readonly review = this.route.snapshot.data['review'] === true;
  readonly canManageRequests = computed(() => {
    const p = this.store.publication(),
      u = this.session.identity();
    return (
      !!p &&
      !this.review &&
      (u?.role === 'super_admin' ||
        u?.organizations.some(
          (o) =>
            o.organizationId === p.organizationId &&
            o.status === 'active' &&
            o.type === 'adoption_entity' &&
            o.permissions.includes('adoptions.requests.review'),
        ))
    );
  });
  readonly canReview = computed(() => {
    const p = this.store.publication(),
      u = this.session.identity();
    return (
      !!p &&
      p.status === 'pending' &&
      p.createdBy !== u?.id &&
      !u?.organizations.some((o) => o.organizationId === p.organizationId)
    );
  });
  readonly date = colombiaDateTime;
  readonly statusLabel = statusLabel;
  readonly auditLabels = auditLabels;
  readonly toProblem = toApiProblem;
  readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly context = computed<Context | null>(() => {
    const p = this.params();
    const c = contextSchema.safeParse({
      organizationId: p.get('organizationId') ?? undefined,
      review: this.review,
      publicationId: p.get('publicationId'),
    });
    return c.success ? c.data : null;
  });
  readonly qp = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly auditPage = computed(() => {
    const n = Number(this.qp().get('page') ?? 1);
    return Number.isInteger(n) && n > 0 && n <= 100000 ? n : 1;
  });
  readonly auditRequest = computed(() => {
    const c = this.context(),
      a = this.store.publication();
    return c && a && !c.review
      ? { context: c, page: this.auditPage(), revision: a.version }
      : null;
  });
  readonly selectedPhoto = signal<string | null>(null);
  readonly photo = rxResource({
    params: () => {
      const c = this.context(),
        a = this.store.publication(),
        id = this.selectedPhoto();
      return c && a && id && a.snapshot?.photos.some((p) => p.mediaId === id)
        ? { context: c, mediaId: id, version: a.version }
        : undefined;
    },
    stream: ({ params }) => this.gateway.photo(params.context, params.mediaId),
  });
  constructor() {
    this.store.load(this.context);
    this.store.loadAudit(this.auditRequest);
    effect(() => {
      const error = this.photo.error();
      if (error) this.store.accessFailed(toApiProblem(error));
    });
    effect(() => {
      this.context();
      this.selectedPhoto.set(null);
    });
  }
  refresh() {
    const c = this.context();
    if (c && !this.store.busy()) {
      this.selectedPhoto.set(null);
      this.store.load(c);
    }
  }
  update(v: { profile: Profile; reason: string }) {
    const c = this.context(),
      a = this.store.publication();
    if (c && a)
      this.execute({
        context: c,
        action: 'update',
        body: { ...v, expectedVersion: a.version },
      });
  }
  execute(c: Command) {
    if (!this.store.busy() && !this.store.refreshRequired()) {
      this.selectedPhoto.set(null);
      this.store.execute(c);
    }
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
}
