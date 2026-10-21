import { VETERINARY_GATEWAY } from '../models/veterinary-gateway';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';
import { AUTH_SESSION } from '../../../core/auth';
import { CredentialDetailStore } from '../state/credential-detail.store';
import { CredentialHeadingComponent } from '../components/credential-heading.component';
import { CredentialReviewFormComponent } from '../components/credential-review-form.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import type { ReviewRequest, RevokeRequest } from '../models/credential';
@Component({
  selector: 'app-credential-review',
  imports: [
    CredentialHeadingComponent,
    CredentialReviewFormComponent,
    ProblemComponent,
  ],
  providers: [CredentialDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-problem [problem]="store.problem()" />
    @if (store.loading()) {
      <p role="status" class="mt-5 text-sm text-muted">Cargando revisión…</p>
    } @else if (store.credential(); as c) {
      <app-credential-heading [credential]="c" />
      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p role="status" class="text-sm text-primary">{{ store.success() }}</p>
        <button
          type="button"
          (click)="store.load(id())"
          [disabled]="store.busy()"
          class="min-h-11 rounded-xl border border-line bg-white px-4 text-sm font-medium disabled:opacity-50"
        >
          Actualizar datos
        </button>
      </div>
      <p class="mt-5 text-sm text-muted">
        Profesional: {{ professionalName() ?? c.professionalId }}
      </p>
      <app-credential-review-form
        [credential]="c"
        [busy]="store.busy() || store.refreshRequired()"
        [blockedReason]="blockedReason()"
        (reviewRequested)="review($event)"
        (revokeRequested)="revoke($event)"
      />
    } @else {
      <button
        type="button"
        (click)="store.load(id())"
        class="mt-5 min-h-11 rounded-xl border border-line px-4"
      >
        Reintentar
      </button>
    }
  `,
})
export class CredentialReviewPage {
  readonly store = inject(CredentialDetailStore);
  private readonly session = inject(AUTH_SESSION);
  readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('credentialId') ?? ''),
    ),
    { initialValue: '' },
  );
  readonly blockedReason = computed(() => {
    const c = this.store.credential(),
      identity = this.session.identity();
    if (!c || !identity) return '';
    if (
      c.professionalId === identity.id ||
      identity.organizations.some((o) => o.organizationId === c.organizationId)
    )
      return 'La revisión debe hacerla otro superadministrador, ajeno al profesional y a esta empresa.';
    return '';
  });
  private readonly gateway = inject(VETERINARY_GATEWAY);
  readonly professional = rxResource({
    params: () => this.store.credential()?.professionalId,
    stream: ({ params }) =>
      params ? this.gateway.professional(params) : of(undefined),
  });
  readonly professionalName = computed(() =>
    this.professional.hasValue()
      ? this.professional.value()?.fullName
      : undefined,
  );
  constructor() {
    this.store.load(this.id);
  }
  review(body: ReviewRequest) {
    const c = this.store.credential();
    if (
      !c ||
      this.store.busy() ||
      this.store.refreshRequired() ||
      this.blockedReason() ||
      c.status !== 'pending'
    )
      return;
    this.store.execute({ kind: 'review', credentialId: c.id, body });
  }
  revoke(body: RevokeRequest) {
    const c = this.store.credential();
    if (
      !c ||
      this.store.busy() ||
      this.store.refreshRequired() ||
      c.status === 'revoked'
    )
      return;
    this.store.execute({ kind: 'revoke', credentialId: c.id, body });
  }
}
