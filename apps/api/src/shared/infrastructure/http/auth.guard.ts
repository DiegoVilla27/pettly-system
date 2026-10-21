import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AUTH_USE_CASES,
  type AuthUseCases,
} from '../../../modules/auth/application/ports/in/auth-use-cases';
import { ApplicationError } from '../../domain/application-error';
import type { Principal } from '../../../modules/auth/application/results/auth-result';
export type AuthenticatedRequest = Request & {
  principal: Principal;
  requestId: string;
};
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AUTH_USE_CASES) private readonly auth: AuthUseCases) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const bearer = request.headers.authorization;
    if (!bearer?.startsWith('Bearer '))
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'A bearer access token is required.',
      );
    request.principal = await this.auth.authenticate(bearer.slice(7));
    return true;
  }
}
