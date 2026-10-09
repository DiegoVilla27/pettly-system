import { ApplicationError } from '../../../../shared/domain/application-error';
import { Email } from '../../../../shared/domain/email';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersAdministration } from '../ports/out/users-administration';
import type { BootstrapSuperAdminCommand } from '../commands/bootstrap-super-admin.command';
export class BootstrapSuperAdminHandler {
  constructor(
    private readonly administration: UsersAdministration,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  execute(command: BootstrapSuperAdminCommand) {
    const email = Email.create(command.email).value;
    return this.administration.run(async (work) => {
      await work.lock('users:administration');
      if (await work.countSuperAdmins(false))
        throw new ApplicationError(
          'CONFLICT',
          'A super administrator already exists. Bootstrap is first-use only.',
        );
      const target = await work.findByEmail(email);
      if (!target)
        throw new ApplicationError(
          'USER_NOT_FOUND',
          'Register and verify the account before bootstrapping.',
        );
      await work.lock(`user:${target.id}`);
      const now = this.clock.now();
      const updated = await work.grantSuperAdmin(target.id, now);
      await work.audit({
        id: this.entropy.id(),
        actorId: null,
        targetId: target.id,
        action: 'user.global_role_granted',
        previousValue: target.globalRole,
        nextValue: 'super_admin',
        reason:
          'First super administrator provisioned by trusted operator CLI.',
        requestId: null,
        createdAt: now,
      });
      return updated;
    });
  }
}
