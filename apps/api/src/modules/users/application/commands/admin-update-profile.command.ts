import type { ProfileChanges } from '../results/user-profile';
export class AdminUpdateProfileCommand {
  constructor(
    readonly actorId: string,
    readonly userId: string,
    readonly changes: ProfileChanges,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
