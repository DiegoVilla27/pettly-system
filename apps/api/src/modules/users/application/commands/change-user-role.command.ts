import type { GlobalRole } from '../../../../shared/domain/authorization';
export class ChangeUserRoleCommand {
  constructor(
    readonly actorId: string,
    readonly userId: string,
    readonly role: GlobalRole,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
