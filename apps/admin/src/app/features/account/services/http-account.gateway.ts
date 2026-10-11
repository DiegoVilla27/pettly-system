import { inject, Injectable } from '@angular/core';
import { defer, map, switchMap } from 'rxjs';
import {
  uuid,
  string,
  minLength,
  maxLength,
  email,
  strictObject,
} from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import {
  mapProfile,
  mapSessions,
  profileSchema,
} from '../mappers/account.mapper';
import type { AccountGateway } from '../models/account-gateway';
import type { AccountCommand } from '../models/account';
const password = string().check(minLength(1), maxLength(128)),
  newPassword = string().check(minLength(12), maxLength(128));
const invalid = () =>
  new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa los campos y confirma el cambio.',
  );
@Injectable()
export class HttpAccountGateway implements AccountGateway {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AUTH_SESSION);
  profile() {
    return this.api
      .request('getCurrentUser')
      .pipe(map((dto) => mapProfile(dto, this.session.identity()?.id ?? '')));
  }
  sessions(page: number) {
    return defer(() => {
      if (!Number.isInteger(page) || page < 1) throw invalid();
      return this.api
        .request('listOwnSessions', { query: { page, limit: 20 } })
        .pipe(map((dto) => mapSessions(dto, page)));
    });
  }
  execute(c: AccountCommand) {
    return defer(() => {
      switch (c.kind) {
        case 'profile':
          if (
            !profileSchema.safeParse(c.body).success ||
            !Object.keys(c.body).length
          )
            throw invalid();
          return this.api.request('updateCurrentUser', { body: c.body });
        case 'password':
          if (
            !strictObject({ currentPassword: password, newPassword }).safeParse(
              c.body,
            ).success ||
            c.body.currentPassword === c.body.newPassword
          )
            throw invalid();
          return this.api.request('changePassword', { body: c.body });
        case 'email':
          if (
            !strictObject({ password, email: email() }).safeParse(c.body)
              .success
          )
            throw invalid();
          return this.api.request('requestEmailChange', { body: c.body });
        case 'delete':
          if (
            !strictObject({ password, reason: reasonSchema }).safeParse(c.body)
              .success
          )
            throw invalid();
          return this.api.request('deleteOwnAccount', { body: c.body });
        case 'logout-all':
          return this.api.request('logoutAll');
        case 'revoke':
          if (!uuid().safeParse(c.sessionId).success) throw invalid();
          return this.api
            .request('listOwnSessions', { query: { page: 1, limit: 100 } })
            .pipe(
              switchMap((dto) => {
                const s = dto.items.find((s) => s.id === c.sessionId);
                if (!s) {
                  /* The selected owned session may be on a later page; server checks ownership. */ return this.api.request(
                    'revokeOwnSession',
                    { path: { sessionId: c.sessionId } },
                  );
                }
                if (s.current !== c.current) throw invalid();
                return this.api.request('revokeOwnSession', {
                  path: { sessionId: c.sessionId },
                });
              }),
            );
      }
    }).pipe(map(() => undefined));
  }
}
