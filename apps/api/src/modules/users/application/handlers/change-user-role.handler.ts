import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  administrativeReason,
  requireSuperAdmin,
  GLOBAL_ROLES,
} from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersAdministration } from '../ports/out/users-administration';
import type { ChangeUserRoleCommand } from '../commands/change-user-role.command';
export class ChangeUserRoleHandler {
  constructor(
    private readonly administration: UsersAdministration,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  execute(command: ChangeUserRoleCommand) {
    const reason = administrativeReason(command.reason);
    if (!GLOBAL_ROLES.includes(command.role))
      throw new ApplicationError('INVALID_INPUT', 'Unsupported global role.');
    return this.administration.run(async (work) => {
      await work.lock('users:administration');
      for (const id of [...new Set([command.actorId, command.userId])].sort())
        await work.lock(`user:${id}`);
      const actor = await work.findById(command.actorId);
      requireSuperAdmin(actor);
      const target = await work.findById(command.userId);
      if (!target)
        throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
      if (target.status !== 'active' || !target.emailVerifiedAt)
        throw new ApplicationError(
          'CONFLICT',
          'The target must be active and email verified.',
        );
      if (target.globalRole === command.role) return target;
      if (
        target.globalRole === 'super_admin' &&
        (await work.countSuperAdmins(true)) <= 1
      )
        throw new ApplicationError(
          'CONFLICT',
          'The last active super administrator cannot lose this role.',
        );
      const now = this.clock.now();
      const updated = await work.setGlobalRole(target.id, command.role, now);
      await work.revokeSessions(target.id, now);
      await work.audit({
        id: this.entropy.id(),
        actorId: command.actorId,
        targetId: target.id,
        action: 'user.global_role_changed',
        previousValue: target.globalRole,
        nextValue: command.role,
        reason,
        requestId: command.requestId,
        createdAt: now,
      });
      return updated;
    });
  }
}
