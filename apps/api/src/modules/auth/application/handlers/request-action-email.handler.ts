import { Email } from '../../../../shared/domain/email';
import type {
  ForgotPasswordCommand,
  ResendVerificationCommand,
} from '../commands/auth.commands';
import type { TokenPurpose } from '../ports/out/auth-persistence';
import { requestEmail, type HandlerDependencies } from './handler-dependencies';
export class RequestActionEmailHandler {
  constructor(
    private readonly deps: HandlerDependencies,
    private readonly purpose: Extract<TokenPurpose, 'verification' | 'reset'>,
  ) {}
  execute(command: ForgotPasswordCommand | ResendVerificationCommand) {
    const email = Email.create(command.email).value;
    return this.deps.uow.run(async (work) => {
      const initial = await work.users.findByEmail(email);
      if (!initial) return;
      await work.lock(`user:${initial.id}`);
      const user = await work.users.findById(initial.id);
      if (
        !user ||
        user.status !== 'active' ||
        user.email !== email ||
        !(await work.auth.passwordHash(user.id)) ||
        (this.purpose === 'verification' && user.emailVerifiedAt)
      )
        return;
      await requestEmail(work, this.deps, user.id, email, this.purpose);
    });
  }
}
