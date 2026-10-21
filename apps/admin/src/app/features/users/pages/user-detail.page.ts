import { DestructiveActionComponent } from '../../../shared/ui/destructive-action.component';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UserDetailStore } from '../state/user-detail.store';
import { UserHeadingComponent } from '../components/user-heading.component';
import { AuditedActionComponent } from '../components/audited-action.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
@Component({
  selector: 'app-user-detail',
  imports: [
    DatePipe,
    DestructiveActionComponent,
    UserHeadingComponent,
    AuditedActionComponent,
    ProblemComponent,
  ],
  providers: [UserDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-detail.page.html',
})
export class UserDetailPage {
  readonly invitationQueued =
    inject(Router).currentNavigation()?.extras.state?.['invitationQueued'] ===
    true;
  readonly store = inject(UserDetailStore);
  readonly userId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('userId') ?? '')),
    { initialValue: '' },
  );
  readonly profile = computed(() => {
    const u = this.store.user();
    return u
      ? [
          { label: 'Nombres', value: u.name },
          { label: 'Apellidos', value: u.lastName },
          { label: 'Edad', value: u.age === null ? null : u.age + ' años' },
          { label: 'Fecha de nacimiento', value: u.dateOfBirth },
          { label: 'Teléfono', value: u.phone },
          { label: 'País', value: u.countryCode },
          { label: 'Departamento o región', value: u.region },
          { label: 'Ciudad', value: u.city },
          { label: 'Dirección', value: u.address },
          { label: 'Complemento', value: u.addressLine2 },
          { label: 'Código postal', value: u.postalCode },
        ]
      : [];
  });
  constructor() {
    this.store.load(this.userId);
  }
}
