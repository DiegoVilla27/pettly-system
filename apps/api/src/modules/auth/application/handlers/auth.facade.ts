import { AuthenticateQuery } from '../queries/authenticate.query';
import type { AuthUseCases } from '../ports/in/auth-use-cases';
import type { HandlerDependencies } from './handler-dependencies';
import { RegisterHandler } from './register.handler';
import { LoginHandler } from './login.handler';
import { RefreshHandler } from './refresh.handler';
import { LogoutHandler, LogoutAllHandler } from './logout.handlers';
import { RequestActionEmailHandler } from './request-action-email.handler';
import {
  VerifyEmailHandler,
  ResetPasswordHandler,
} from './consume-action-token.handlers';
import { AuthenticateHandler } from './authenticate.handler';
import { AccountSecurityHandlers } from './account-security.handlers';
export function createAuthUseCases(deps: HandlerDependencies): AuthUseCases {
  const register = new RegisterHandler(deps),
    login = new LoginHandler(deps),
    refresh = new RefreshHandler(deps),
    logout = new LogoutHandler(deps),
    logoutAll = new LogoutAllHandler(deps),
    forgot = new RequestActionEmailHandler(deps, 'reset'),
    resend = new RequestActionEmailHandler(deps, 'verification'),
    verify = new VerifyEmailHandler(deps),
    reset = new ResetPasswordHandler(deps),
    authenticate = new AuthenticateHandler(deps);
  const security = new AccountSecurityHandlers(deps);
  return {
    invite: (c) => security.invite(c),
    resendInvitation: (c) => security.resendInvitation(c),
    remove: (c) => security.remove(c),
    changePassword: (c) => security.changePassword(c),
    changeEmail: (c) => security.changeEmail(c),
    confirmEmailChange: (c) => security.confirmEmail(c),
    acceptInvitation: (c) => security.accept(c),
    listSessions: (q) => security.listSessions(q),
    revokeSession: (c) => security.revokeSession(c),
    register: (c) => register.execute(c),
    login: (c) => login.execute(c),
    refresh: (c) => refresh.execute(c),
    logout: (c) => logout.execute(c),
    logoutAll: (c) => logoutAll.execute(c),
    forgotPassword: (c) => forgot.execute(c),
    resendVerification: (c) => resend.execute(c),
    verifyEmail: (c) => verify.execute(c),
    resetPassword: (c) => reset.execute(c),
    authenticate: (t) => authenticate.execute(new AuthenticateQuery(t)),
  };
}
