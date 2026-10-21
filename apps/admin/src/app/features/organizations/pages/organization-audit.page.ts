import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { OrganizationDetailStore } from '../state/organization-detail.store';
import { OrganizationHeadingComponent } from '../components/organization-heading.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-organization-audit',
  imports: [
    DatePipe,
    RouterLink,
    OrganizationHeadingComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [OrganizationDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization-audit.page.html',
})
export class OrganizationAuditPage {
  readonly store = inject(OrganizationDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('organizationId') ?? '')),
    { initialValue: '' },
  );
  readonly request = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      map(([identity, params]) => {
        const page = Number(params.get('page'));
        return {
          organizationId: identity.get('organizationId') ?? '',
          page:
            Number.isSafeInteger(page) && page >= 1 && page <= 100000
              ? page
              : 1,
        };
      }),
    ),
    { initialValue: { organizationId: '', page: 1 } },
  );
  constructor() {
    this.store.load(this.id);
    this.store.loadAudit(this.request);
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
  label(action: string) {
    return (
      (
        {
          'organization.created': 'Organización creada',
          'organization.requested': 'Alta solicitada',
          'organization.profile_updated': 'Perfil actualizado',
          'organization.submitted': 'Solicitud enviada',
          'organization.approved': 'Organización aprobada',
          'organization.rejected': 'Solicitud rechazada',
          'organization.status_changed': 'Estado operativo actualizado',
          'organization.responsible_changed': 'Responsable actualizado',
          'organization.deleted': 'Organización archivada',
          'membership.role_assigned': 'Membresía asignada',
          'membership.role_removed': 'Membresía retirada',
        } as Record<string, string>
      )[action] ?? action
    );
  }
}
