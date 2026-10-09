import { ApplicationError } from '../../../../shared/domain/application-error';
import { Password } from '../../domain/value-objects/password';
import type {
  VerifyEmailCommand,
  ResetPasswordCommand,
} from '../commands/auth.commands';
import type { AuthWork, TokenPurpose } from '../ports/out/auth-persistence';
import type { HandlerDependencies } from './handler-dependencies';
async function consume(
  work: AuthWork,
  deps: HandlerDependencies,
  raw: string,
  purpose: TokenPurpose,
  action: (userId: string) => Promise<void>,
) {
  const hash = deps.entropy.digest(raw),
    initial = await work.auth.actionToken(hash);
  if (!initial)
    throw new ApplicationError(
      'INVALID_TOKEN',
      'The action token is invalid or expired.',
    );
  await work.lock(`user:${initial.userId}`);
  const token = await work.auth.actionToken(hash);
  if (
    !token ||
    token.purpose !== purpose ||
    token.consumedAt ||
    token.expiresAt <= deps.clock.now()
  )
    throw new ApplicationError(
      'INVALID_TOKEN',
      'The action token is invalid or expired.',
    );
  const user = await work.users.findById(token.userId);
  if (!user || user.status !== 'active')
    throw new ApplicationError('INVALID_TOKEN', 'The account is unavailable.');
  await action(token.userId);
  await work.cancelEmail(user.email, purpose, token.userId);
  await work.auth.consumeActionToken(hash, deps.clock.now());
}
export class VerifyEmailHandler {
  constructor(private readonly deps: HandlerDependencies) {}
  execute(command: VerifyEmailCommand) {
    return this.deps.uow.run((work) =>
      consume(work, this.deps, command.token, 'verification', (id) =>
        work.users.verifyEmail(id, this.deps.clock.now()),
      ),
    );
  }
}
export class ResetPasswordHandler {
  constructor(private readonly deps: HandlerDependencies) {}
  async execute(command: ResetPasswordCommand) {
    Password.validate(command.password);
    const hash = await this.deps.passwords.hash(command.password);
    await this.deps.uow.run((work) =>
      consume(work, this.deps, command.token, 'reset', async (id) => {
        await work.auth.savePassword(id, hash);
        await work.auth.revokeAll(id, this.deps.clock.now());
        await work.auth.invalidateAllActionTokens(id, this.deps.clock.now());
        const pending = await work.auth.pendingEmail(id);
        if (pending) await work.cancelEmail(pending, 'email_change', id);
        await work.auth.setPendingEmail(id, null);
        const user = await work.users.findById(id);
        if (user) {
          await work.cancelEmail(user.email, 'email_change', id);
          await work.enqueueEmail({
            userId: id,
            id: this.deps.entropy.id(),
            to: user.email,
            token: '',
            purpose: 'password_changed',
            expiresAt: new Date(this.deps.clock.now().getTime() + 86400000),
          });
        }
      }),
    );
  }
}
