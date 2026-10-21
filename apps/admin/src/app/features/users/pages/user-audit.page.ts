import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { UserDetailStore } from '../state/user-detail.store';
import { UserHeadingComponent } from '../components/user-heading.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-user-audit',
  imports: [
    DatePipe,
    UserHeadingComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [UserDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-audit.page.html',
})
export class UserAuditPage {
  readonly store = inject(UserDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly request = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('userId') ?? '')),
    { initialValue: '' },
  );
  readonly auditRequest = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      map(([identity, params]) => {
        const page = Number(params.get('page'));
        return {
          userId: identity.get('userId') ?? '',
          page:
            Number.isSafeInteger(page) && page >= 1 && page <= 100000
              ? page
              : 1,
        };
      }),
    ),
    {
      initialValue: {
        userId: this.route.snapshot.paramMap.get('userId') ?? '',
        page: 1,
      },
    },
  );
  constructor() {
    this.store.load(this.request);
    this.store.loadAudit(this.auditRequest);
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
  label(action: string) {
    const labels: Record<string, string> = {
      'user.created': 'Cuenta creada',
      'user.invitation_resent': 'Invitación reenviada',
      'user.profile_updated': 'Perfil actualizado',
      'user.status_changed': 'Estado actualizado',
      'user.global_role_changed': 'Rol global actualizado',
      'user.email_changed': 'Correo actualizado',
      'user.deleted': 'Cuenta eliminada',
      'user.global_role_granted': 'Primer superadministrador',
    };
    return labels[action] ?? action;
  }
}
