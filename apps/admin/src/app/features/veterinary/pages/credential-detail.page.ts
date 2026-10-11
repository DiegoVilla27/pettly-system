import { VETERINARY_GATEWAY } from '../models/veterinary-gateway';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { of, map, interval, startWith } from 'rxjs';
import { CredentialDetailStore } from '../state/credential-detail.store';
import { CredentialHeadingComponent } from '../components/credential-heading.component';
import { EvidenceViewerComponent } from '../components/evidence-viewer.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { documentKinds } from '../models/credential';
@Component({
  selector: 'app-credential-detail',
  imports: [
    DatePipe,
    RouterLink,
    CredentialHeadingComponent,
    EvidenceViewerComponent,
    ProblemComponent,
  ],
  providers: [CredentialDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-detail.page.html',
})
export class CredentialDetailPage {
  readonly store = inject(CredentialDetailStore);
  readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('credentialId') ?? ''),
    ),
    { initialValue: '' },
  );
  readonly now = toSignal(
    interval(60000).pipe(
      startWith(0),
      map(() => Date.now()),
    ),
    { initialValue: Date.now() },
  );
  readonly expired = computed(() => {
    const c = this.store.credential();
    return (
      c?.status === 'approved' &&
      !!c.verifiedUntil &&
      Date.parse(c.verifiedUntil) <= this.now()
    );
  });
  readonly documents = computed(
    () =>
      this.store.credential()?.documents.map((d, i) => ({
        ...d,
        label: documentKinds.find((k) => k.value === d.kind)?.label ?? d.kind,
        page: i + 1,
      })) ?? [],
  );
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
}
