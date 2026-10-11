import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PUBLICATIONS_GATEWAY } from '../models/publications-gateway';
import { PublicationCreateStore } from '../state/publication-create.store';
import { PublicationFormComponent } from '../components/publication-form.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { ApiProblem, toApiProblem } from '../../../core/api';
import type { Profile } from '../models/publication';
@Component({
  selector: 'app-publication-create',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PublicationFormComponent,
    ProblemComponent,
  ],
  providers: [PublicationCreateStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publication-create.page.html',
})
export class PublicationCreatePage {
  readonly store = inject(PublicationCreateStore);
  private readonly router = inject(Router);
  private readonly gateway = inject(PUBLICATIONS_GATEWAY);
  readonly toProblem = toApiProblem;
  readonly organizationId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('organizationId') ?? ''),
    ),
    { initialValue: '' },
  );
  readonly animalId = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    Validators.pattern(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  ]);
  readonly lookupForm = inject(FormBuilder).nonNullable.group({
    animalId: this.animalId,
  });
  readonly selected = signal<{
    organizationId: string;
    animalId: string;
  } | null>(null);
  readonly shelter = rxResource({
    params: () => this.organizationId(),
    stream: ({ params }) =>
      this.gateway.shelters('', params).pipe(
        map((items) => {
          const s = items.find((x) => x.id === params);
          if (!s)
            throw new ApiProblem(
              403,
              'FORBIDDEN',
              'Selecciona un refugio activo y autorizado.',
            );
          return s;
        }),
      ),
  });
  readonly candidate = rxResource({
    params: () => {
      const s = this.selected();
      return s?.organizationId === this.organizationId() ? s : undefined;
    },
    stream: ({ params }) =>
      this.gateway.candidate(params.organizationId, params.animalId),
  });
  readonly ready = computed(
    () =>
      this.shelter.value()?.id === this.organizationId() &&
      !this.candidate.isLoading() &&
      !!this.candidate.value() &&
      !this.candidate.error(),
  );
  constructor() {
    effect(() => {
      this.organizationId();
      this.selected.set(null);
      this.animalId.reset();
    });
    effect(() => {
      const p = this.store.created();
      if (p && p.organizationId === this.organizationId())
        void this.router.navigate(['/adopciones', p.organizationId, p.id], {
          replaceUrl: true,
        });
    });
  }
  choose() {
    this.animalId.markAsTouched();
    if (this.animalId.valid && !this.store.busy() && !this.store.uncertain())
      this.selected.set({
        organizationId: this.organizationId(),
        animalId: this.animalId.value.trim(),
      });
  }
  create(v: { profile: Profile; reason: string }) {
    const a = this.candidate.value();
    if (this.ready() && a && !this.store.busy() && !this.store.uncertain())
      this.store.create({
        ...v,
        organizationId: this.organizationId(),
        animalId: a.id,
      });
  }
}
