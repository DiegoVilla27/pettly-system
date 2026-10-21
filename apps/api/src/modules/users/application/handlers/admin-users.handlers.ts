import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  administrativeReason,
  requireSuperAdmin,
} from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersAdministration } from '../ports/out/users-administration';
import type { ListUsersQuery } from '../queries/list-users.query';
import type { GetUserQuery } from '../queries/get-user.query';
import type { AdminUpdateProfileCommand } from '../commands/admin-update-profile.command';
export class AdminUsersHandlers {
  constructor(
    private readonly administration: UsersAdministration,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  list(query: ListUsersQuery) {
    if (
      !Number.isInteger(query.page) ||
      query.page < 1 ||
      query.page > 100000 ||
      !Number.isInteger(query.limit) ||
      query.limit < 1 ||
      query.limit > 100 ||
      (query.search &&
        (query.search.length > 100 || /\p{Cc}/u.test(query.search))) ||
      !['createdAt', 'email', 'name'].includes(query.sortBy) ||
      !['asc', 'desc'].includes(query.sortOrder)
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Invalid pagination, search or ordering.',
      );
    return this.administration.run(async (work) => {
      requireSuperAdmin(await work.findById(query.actorId));
      return work.list(query);
    });
  }
  audit(query: import('../queries/list-user-audit.query').ListUserAuditQuery) {
    if (
      !Number.isInteger(query.page) ||
      query.page < 1 ||
      query.page > 100000 ||
      !Number.isInteger(query.limit) ||
      query.limit < 1 ||
      query.limit > 100
    )
      throw new ApplicationError('INVALID_INPUT', 'Invalid pagination.');
    return this.administration.run(async (work) => {
      requireSuperAdmin(await work.findById(query.actorId));
      if (!(await work.findById(query.userId)))
        throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
      return work.listAudit(query);
    });
  }
  get(query: GetUserQuery) {
    return this.administration.run(async (work) => {
      requireSuperAdmin(await work.findById(query.actorId));
      const user = await work.findById(query.userId);
      if (!user)
        throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
      return user;
    });
  }
  update(command: AdminUpdateProfileCommand) {
    const reason = administrativeReason(command.reason);
    return this.administration.run(async (work) => {
      await work.lock('users:administration');
      for (const id of [...new Set([command.actorId, command.userId])].sort())
        await work.lock(`user:${id}`);
      requireSuperAdmin(await work.findById(command.actorId));
      const target = await work.findById(command.userId);
      if (!target)
        throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
      const now = this.clock.now();
      const user = await work.updateProfile(target.id, command.changes, now);
      await work.audit({
        id: this.entropy.id(),
        actorId: command.actorId,
        targetId: target.id,
        action: 'user.profile_updated',
        previousValue: 'profile',
        nextValue: 'profile',
        reason,
        requestId: command.requestId,
        createdAt: now,
      });
      return user;
    });
  }
}
