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
import { AnimalDetailStore } from '../state/animal-detail.store';
import { ANIMALS_GATEWAY } from '../models/animals-gateway';
import { contextSchema } from '../mappers/animals.mapper';
import { AnimalFormComponent } from '../components/animal-form.component';
import { AnimalActionComponent } from '../components/animal-action.component';
import { PrivateImageComponent } from '../../../shared/ui/private-image.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
import { toApiProblem } from '../../../core/api';
import {
  speciesLabel,
  sizes,
  statusLabel,
  auditLabels,
  type AnimalProfile,
  type AnimalCommand,
  type AnimalContext,
} from '../models/animal';
@Component({
  selector: 'app-animal-detail',
  imports: [
    RouterLink,
    AnimalFormComponent,
    AnimalActionComponent,
    PrivateImageComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [AnimalDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './animal-detail.page.html',
})
export class AnimalDetailPage {
  readonly store = inject(AnimalDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gateway = inject(ANIMALS_GATEWAY);
  readonly date = colombiaDateTime;
  readonly speciesLabel = speciesLabel;
  readonly statusLabel = statusLabel;
  readonly sizes = sizes;
  readonly auditLabels = auditLabels;
  readonly toProblem = toApiProblem;
  readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly context = computed<AnimalContext | null>(() => {
    const p = this.params();
    const c = contextSchema.safeParse({
      organizationId: p.get('organizationId'),
      animalId: p.get('animalId'),
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
      a = this.store.animal();
    return c && a
      ? { context: c, page: this.auditPage(), revision: a.version }
      : null;
  });
  readonly selectedPhoto = signal<string | null>(null);
  readonly photo = rxResource({
    params: () => {
      const c = this.context(),
        a = this.store.animal(),
        id = this.selectedPhoto();
      return c && a && id && a.photos.some((p) => p.mediaId === id)
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
  update(v: { profile: AnimalProfile; reason: string }) {
    const c = this.context(),
      a = this.store.animal();
    if (c && a)
      this.execute({
        context: c,
        action: 'update',
        body: { ...v, expectedVersion: a.version },
      });
  }
  execute(c: AnimalCommand) {
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
