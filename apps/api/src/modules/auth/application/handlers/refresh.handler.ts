import { ApplicationError } from '../../../../shared/domain/application-error';
import { Session } from '../../domain/aggregates/session';
import type { RefreshCommand } from '../commands/auth.commands';
import { authResult, type HandlerDependencies } from './handler-dependencies';
export class RefreshHandler {
  constructor(private readonly deps: HandlerDependencies) {}
  async execute(command: RefreshCommand) {
    const hash = this.deps.entropy.digest(command.token),
      newToken = this.deps.entropy.token();
    const state = await this.deps.uow.run(async (work) => {
      const initial = await work.auth.refreshToken(hash);
      if (!initial)
        throw new ApplicationError(
          'INVALID_TOKEN',
          'The refresh token is invalid.',
        );
      await work.lock(`user:${initial.session.userId}`);
      const current = await work.auth.refreshToken(hash);
      if (!current)
        throw new ApplicationError(
          'INVALID_TOKEN',
          'The refresh token is invalid.',
        );
      if (current.consumedAt) {
        await work.auth.revokeSession(
          current.session.id,
          this.deps.clock.now(),
        );
        return null;
      }
      new Session(current.session).ensureActive(this.deps.clock.now());
      const user = await work.users.findById(current.session.userId);
      if (!user || user.status !== 'active' || !user.emailVerifiedAt)
        throw new ApplicationError(
          'INVALID_TOKEN',
          'The account is unavailable.',
        );
      await work.auth.rotateRefresh(
        hash,
        this.deps.entropy.digest(newToken),
        current.session.id,
        this.deps.clock.now(),
      );
      return current.session;
    });
    // Throw after commit so reuse revocation cannot be rolled back.
    if (!state)
      throw new ApplicationError(
        'INVALID_TOKEN',
        'Refresh token reuse detected. Sign in again.',
      );
    return authResult(this.deps, state, newToken);
  }
}
