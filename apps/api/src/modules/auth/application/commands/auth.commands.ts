import type { NewProfile } from '../../../users/application/results/user-profile';
export class RegisterCommand {
  constructor(
    readonly email: string,
    readonly profile: NewProfile,
    readonly password: string,
  ) {}
}
export class LoginCommand {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {}
}
export class RefreshCommand {
  constructor(readonly token: string) {}
}
export class LogoutCommand {
  constructor(
    readonly userId: string,
    readonly sessionId: string,
  ) {}
}
export class LogoutAllCommand {
  constructor(readonly userId: string) {}
}
export class ForgotPasswordCommand {
  constructor(readonly email: string) {}
}
export class ResendVerificationCommand {
  constructor(readonly email: string) {}
}
export class VerifyEmailCommand {
  constructor(readonly token: string) {}
}
export class ResetPasswordCommand {
  constructor(
    readonly token: string,
    readonly password: string,
  ) {}
}
