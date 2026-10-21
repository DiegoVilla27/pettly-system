import { ApplicationError } from '../../../../shared/domain/application-error';
import { Email } from '../../../../shared/domain/email';
import { Password } from '../../domain/value-objects/password';
import type { RegisterCommand } from '../commands/auth.commands';
import { requestEmail, type HandlerDependencies } from './handler-dependencies';
export class RegisterHandler {
  constructor(private readonly deps: HandlerDependencies) {}
  async execute(command: RegisterCommand): Promise<void> {
    const email = Email.create(command.email).value;
    Password.validate(command.password);
    const hash = await this.deps.passwords.hash(command.password);
    await this.deps.uow.run(async (work) => {
      await work.lock(`register:${email}`);
      if (await work.users.findByEmail(email))
        throw new ApplicationError(
          'EMAIL_TAKEN',
          'An account with this email already exists.',
        );
      const user = await work.users.create(
        this.deps.entropy.id(),
        email,
        command.profile,
        this.deps.clock.now(),
      );
      await work.auth.savePassword(user.id, hash);
      await requestEmail(work, this.deps, user.id, email, 'verification');
    });
  }
}
