import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Profile, Sessions, AccountCommand } from './account';
export interface AccountGateway {
  profile(): Observable<Profile>;
  sessions(page: number): Observable<Sessions>;
  execute(c: AccountCommand): Observable<void>;
}
export const ACCOUNT_GATEWAY = new InjectionToken<AccountGateway>(
  'ACCOUNT_GATEWAY',
);
