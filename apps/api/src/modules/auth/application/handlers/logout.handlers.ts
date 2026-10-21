import type {
  LogoutCommand,
  LogoutAllCommand,
} from '../commands/auth.commands';
import type { HandlerDependencies } from './handler-dependencies';
export class LogoutHandler {
  constructor(private readonly deps: HandlerDependencies) {}
  execute(command: LogoutCommand) {
    return this.deps.uow.run(async (work) => {
      await work.lock(`user:${command.userId}`);
      const session = await work.auth.session(command.sessionId);
      if (session?.userId === command.userId)
        await work.auth.revokeSession(command.sessionId, this.deps.clock.now());
    });
  }
}
export class LogoutAllHandler {
  constructor(private readonly deps: HandlerDependencies) {}
  execute(command: LogoutAllCommand) {
    return this.deps.uow.run(async (work) => {
      await work.lock(`user:${command.userId}`);
      await work.auth.revokeAll(command.userId, this.deps.clock.now());
    });
  }
}
