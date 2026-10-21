import { ApplicationError } from '../../../../shared/domain/application-error';
import { Email } from '../../../../shared/domain/email';
import { Session } from '../../domain/aggregates/session';
import type { LoginCommand } from '../commands/auth.commands';
import { authResult, type HandlerDependencies } from './handler-dependencies';
export class LoginHandler {
  constructor(private readonly deps: HandlerDependencies) {}
  async execute(command: LoginCommand) {
    const email = Email.create(command.email).value;
    const initial = await this.deps.uow.run(async (work) => {
      const user = await work.users.findByEmail(email);
      return {
        user,
        hash: user ? await work.auth.passwordHash(user.id) : null,
      };
    });
    const valid = await this.deps.passwords.verify(
      initial.hash || this.deps.dummyPasswordHash,
      command.password,
    );
    if (!initial.user || !initial.hash || !valid)
      throw new ApplicationError(
        'INVALID_CREDENTIALS',
        'Invalid email or password.',
      );
    const userId = initial.user.id,
      refreshToken = this.deps.entropy.token();
    const state = await this.deps.uow.run(async (work) => {
      await work.lock(`user:${userId}`);
      const user = await work.users.findById(userId);
      if (
        !user ||
        user.status !== 'active' ||
        (await work.auth.passwordHash(userId)) !== initial.hash
      )
        throw new ApplicationError(
          'INVALID_CREDENTIALS',
          'Invalid email or password.',
        );
      if (!user.emailVerifiedAt)
        throw new ApplicationError(
          'EMAIL_NOT_VERIFIED',
          'Verify your email before signing in.',
        );
      const session = Session.create(
        this.deps.entropy.id(),
        userId,
        this.deps.clock.now(),
        this.deps.policy.refreshSeconds,
      ).snapshot();
      await work.auth.addSession(
        session,
        this.deps.entropy.digest(refreshToken),
      );
      return session;
    });
    return authResult(this.deps, state, refreshToken);
  }
}
