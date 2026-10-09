import type { AuthenticateQuery } from '../queries/authenticate.query';
import { ApplicationError } from '../../../../shared/domain/application-error';
import { Session } from '../../domain/aggregates/session';
import type { HandlerDependencies } from './handler-dependencies';
export class AuthenticateHandler {
  constructor(private readonly deps: HandlerDependencies) {}
  async execute(query: AuthenticateQuery) {
    const principal = this.deps.access.verify(query.accessToken);
    return this.deps.uow.run(async (work) => {
      const session = await work.auth.session(principal.sessionId);
      const user = await work.users.findById(principal.userId);
      if (
        !session ||
        session.userId !== principal.userId ||
        !user ||
        user.status !== 'active' ||
        !user.emailVerifiedAt
      )
        throw new ApplicationError(
          'UNAUTHENTICATED',
          'Authentication is required.',
        );
      try {
        new Session(session).ensureActive(this.deps.clock.now());
      } catch {
        throw new ApplicationError(
          'UNAUTHENTICATED',
          'The session has expired or has been revoked.',
        );
      }
      return principal;
    });
  }
}
