import { ApplicationError } from '../../../../shared/domain/application-error';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersAdministration } from '../ports/out/users-administration';
import type { ChangeUserStatusCommand } from '../commands/change-user-status.command';
export class ChangeUserStatusHandler {
  constructor(
    private readonly administration: UsersAdministration,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  execute(command: ChangeUserStatusCommand) {
    const reason = command.reason.trim();
    if (reason.length < 10 || reason.length > 500 || /\p{Cc}/u.test(reason))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Provide a reason of 10 to 500 characters without control characters.',
      );
    return this.administration.run(async (work) => {
      // Role bootstrap and status changes share this lock to protect the last active administrator.
      await work.lock('users:administration');
      for (const id of [...new Set([command.actorId, command.userId])].sort())
        await work.lock(`user:${id}`);
      const actor = await work.findById(command.actorId);
      if (
        !actor ||
        actor.status !== 'active' ||
        !actor.emailVerifiedAt ||
        actor.globalRole !== 'super_admin'
      )
        throw new ApplicationError(
          'FORBIDDEN',
          'Super administrator access is required.',
        );
      const target = await work.findById(command.userId);
      if (!target)
        throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
      if (command.status !== 'active' && command.status !== 'disabled')
        throw new ApplicationError('INVALID_INPUT', 'Unsupported user status.');
      if (target.status === command.status) return target;
      if (
        target.globalRole === 'super_admin' &&
        command.status === 'disabled' &&
        (await work.countSuperAdmins(true)) <= 1
      )
        throw new ApplicationError(
          'CONFLICT',
          'The last active super administrator cannot be disabled.',
        );
      const now = this.clock.now();
      const updated = await work.setStatus(target.id, command.status, now);
      if (command.status === 'disabled')
        await work.revokeSessions(target.id, now);
      await work.audit({
        id: this.entropy.id(),
        actorId: actor.id,
        targetId: target.id,
        action: 'user.status_changed',
        previousValue: target.status,
        nextValue: command.status,
        reason,
        requestId: command.requestId,
        createdAt: now,
      });
      return updated;
    });
  }
}
