export class ChangePasswordCommand {
  constructor(
    readonly userId: string,
    readonly sessionId: string,
    readonly currentPassword: string,
    readonly newPassword: string,
  ) {}
}
export class ChangeEmailCommand {
  constructor(
    readonly userId: string,
    readonly sessionId: string,
    readonly password: string,
    readonly email: string,
  ) {}
}
export class ConfirmEmailChangeCommand {
  constructor(readonly token: string) {}
}
export class AcceptInvitationCommand {
  constructor(
    readonly token: string,
    readonly password: string,
  ) {}
}
export class RevokeSessionCommand {
  constructor(
    readonly userId: string,
    readonly sessionId: string,
  ) {}
}
