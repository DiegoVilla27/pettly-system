import type { UserStatus } from '../../domain/aggregates/user';
export class ChangeUserStatusCommand {
  constructor(
    readonly actorId: string,
    readonly userId: string,
    readonly status: UserStatus,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
