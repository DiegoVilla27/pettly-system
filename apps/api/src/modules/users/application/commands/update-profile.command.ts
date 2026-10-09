import type { ProfileChanges } from '../results/user-profile';
export class UpdateProfileCommand {
  constructor(
    readonly userId: string,
    readonly changes: ProfileChanges,
  ) {}
}
