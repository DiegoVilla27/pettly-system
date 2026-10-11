import { Injectable, inject } from '@angular/core';
import { defer, map } from 'rxjs';
import { ApiClient, ApiProblem } from '../../../core/api';
import type { AccessRequest } from '../models/access-action';
import { string, email, minLength, maxLength, regex, object } from 'zod/mini';
@Injectable()
export class AccessActionGateway {
  private readonly api = inject(ApiClient);
  execute(c: AccessRequest) {
    return defer(() => {
      if (['forgot', 'resend'].includes(c.action)) {
        if (!email().safeParse(c.email).success) throw this.invalid();
        return this.api.request(
          c.action === 'forgot' ? 'forgotPassword' : 'resendVerification',
          { body: { email: c.email } },
        );
      }
      if (
        !string()
          .check(minLength(32), maxLength(256), regex(/^[A-Za-z0-9_-]+$/))
          .safeParse(c.token).success
      )
        throw this.invalid();
      switch (c.action) {
        case 'reset':
        case 'invitation':
          if (c.password.length < 12 || c.password.length > 128)
            throw this.invalid();
          return this.api.request(
            c.action === 'reset' ? 'resetPassword' : 'acceptInvitation',
            { body: { token: c.token, password: c.password } },
          );
        case 'verify':
          return this.api.request('verifyEmail', { body: { token: c.token } });
        case 'confirm-email':
          return this.api.request('confirmEmailChange', {
            body: { token: c.token },
          });
        default:
          throw this.invalid();
      }
    }).pipe(
      map((dto) => {
        if (!object({ message: string() }).safeParse(dto).success)
          throw new ApiProblem(
            502,
            'INVALID_RESPONSE',
            'No pudimos confirmar la respuesta.',
          );
      }),
    );
  }
  private invalid() {
    return new ApiProblem(
      400,
      'INVALID_INPUT',
      'El enlace o los campos no son válidos. Solicita otro enlace si venció.',
    );
  }
}
