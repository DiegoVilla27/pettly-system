import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CredentialDetailStore } from '../state/credential-detail.store';
import { CredentialHeadingComponent } from '../components/credential-heading.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { parseFilters } from '../mappers/veterinary.mapper';
@Component({
  selector: 'app-credential-audit',
  imports: [
    DatePipe,
    RouterLink,
    CredentialHeadingComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [CredentialDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-audit.page.html',
})
export class CredentialAuditPage {
  readonly store = inject(CredentialDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('credentialId') ?? '')),
    { initialValue: '' },
  );
  readonly requestedPage = toSignal(
    this.route.queryParamMap.pipe(map((p) => parseFilters(p).page ?? 1)),
    { initialValue: 1 },
  );
  readonly request = computed(() => ({
    credentialId: this.id(),
    page: this.requestedPage(),
  }));
  constructor() {
    this.store.load(this.id);
    this.store.auditLoad(this.request);
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
}
