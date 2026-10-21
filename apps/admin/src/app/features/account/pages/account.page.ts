import { signal } from '@angular/core';
import { AccountStore } from '../state/account.store';
import { ACCOUNT_GATEWAY } from '../models/account-gateway';
import { HttpAccountGateway } from '../services/http-account.gateway';
import { OwnProfileEditorComponent } from '../components/own-profile-editor.component';
import { AccountSecurityComponent } from '../components/account-security.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AUTH_SESSION } from '../../../core/auth';
import { IconComponent } from '../../../shared/ui/icon.component';
@Component({
  selector: 'app-account-page',
  imports: [
    IconComponent,
    OwnProfileEditorComponent,
    AccountSecurityComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [
    AccountStore,
    { provide: ACCOUNT_GATEWAY, useClass: HttpAccountGateway },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.page.html',
})
export class AccountPage {
  readonly store = inject(AccountStore);
  readonly page = signal(1);
  constructor() {
    this.store.load(this.page);
  }
  readonly session = inject(AUTH_SESSION);
}
