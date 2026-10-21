import type { AuthResult, Principal } from '../../results/auth-result';
import type {
  RegisterCommand,
  LoginCommand,
  RefreshCommand,
  LogoutCommand,
  LogoutAllCommand,
  ForgotPasswordCommand,
  ResendVerificationCommand,
  VerifyEmailCommand,
  ResetPasswordCommand,
} from '../../commands/auth.commands';
import type { AccountAdministration } from './account-administration';
import type {
  ChangePasswordCommand,
  ChangeEmailCommand,
  ConfirmEmailChangeCommand,
  AcceptInvitationCommand,
  RevokeSessionCommand,
} from '../../commands/account-security.commands';
import type { ListSessionsQuery } from '../../queries/list-sessions.query';
import type { SessionState } from '../../../domain/aggregates/session';
export interface AuthUseCases extends AccountAdministration {
  changePassword(command: ChangePasswordCommand): Promise<void>;
  changeEmail(command: ChangeEmailCommand): Promise<void>;
  confirmEmailChange(command: ConfirmEmailChangeCommand): Promise<void>;
  acceptInvitation(command: AcceptInvitationCommand): Promise<void>;
  listSessions(query: ListSessionsQuery): Promise<{
    items: (SessionState & { current: boolean })[];
    total: number;
    page: number;
    limit: number;
  }>;
  revokeSession(command: RevokeSessionCommand): Promise<void>;
  register(command: RegisterCommand): Promise<void>;
  login(command: LoginCommand): Promise<AuthResult>;
  refresh(command: RefreshCommand): Promise<AuthResult>;
  logout(command: LogoutCommand): Promise<void>;
  logoutAll(command: LogoutAllCommand): Promise<void>;
  forgotPassword(command: ForgotPasswordCommand): Promise<void>;
  resendVerification(command: ResendVerificationCommand): Promise<void>;
  verifyEmail(command: VerifyEmailCommand): Promise<void>;
  resetPassword(command: ResetPasswordCommand): Promise<void>;
  authenticate(accessToken: string): Promise<Principal>;
}
export const AUTH_USE_CASES = Symbol('AUTH_USE_CASES');
