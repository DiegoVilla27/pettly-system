import type { UsersDirectory } from '../ports/out/users-directory';
import type { Clock } from '../../../../shared/application/runtime-ports';
import { ApplicationError } from '../../../../shared/domain/application-error';
import type { GetProfileQuery } from '../queries/get-profile.query';
import type { UpdateProfileCommand } from '../commands/update-profile.command';
export class GetProfileHandler {
  constructor(private readonly users: UsersDirectory) {}
  async execute(query: GetProfileQuery) {
    const user = await this.users.findById(query.userId);
    if (!user || user.status !== 'active')
      throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
    return user;
  }
}
export class UpdateProfileHandler {
  constructor(
    private readonly users: UsersDirectory,
    private readonly clock: Clock,
  ) {}
  execute(command: UpdateProfileCommand) {
    return this.users.updateProfile(
      command.userId,
      command.changes,
      this.clock.now(),
    );
  }
}
