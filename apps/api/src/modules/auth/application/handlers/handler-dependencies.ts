import type {
  AuthUnitOfWork,
  AuthWork,
  TokenPurpose,
} from '../ports/out/auth-persistence';
import type {
  AccessTokens,
  Clock,
  Entropy,
  PasswordHasher,
} from '../../../../shared/application/runtime-ports';
import type { AuthResult } from '../results/auth-result';
import type { SessionState } from '../../domain/aggregates/session';
export interface AuthPolicy {
  accessSeconds: number;
  refreshSeconds: number;
  verificationSeconds: number;
  resetSeconds: number;
}
export interface HandlerDependencies {
  uow: AuthUnitOfWork;
  clock: Clock;
  entropy: Entropy;
  passwords: PasswordHasher;
  access: AccessTokens;
  policy: AuthPolicy;
  dummyPasswordHash: string;
}
export async function requestEmail(
  work: AuthWork,
  deps: HandlerDependencies,
  userId: string,
  to: string,
  purpose: Extract<TokenPurpose, 'verification' | 'reset'>,
) {
  const token = deps.entropy.token(),
    now = deps.clock.now();
  const expiresAt = new Date(
    now.getTime() +
      1000 *
        (purpose === 'verification'
          ? deps.policy.verificationSeconds
          : deps.policy.resetSeconds),
  );
  await work.auth.replaceActionToken({
    hash: deps.entropy.digest(token),
    userId,
    purpose,
    expiresAt,
    consumedAt: null,
  });
  await work.enqueueEmail({
    userId,
    id: deps.entropy.id(),
    to,
    token,
    purpose,
    expiresAt,
  });
}
export function authResult(
  deps: HandlerDependencies,
  session: SessionState,
  refreshToken: string,
): AuthResult {
  return {
    accessToken: deps.access.issue(session.userId, session.id),
    refreshToken,
    sessionId: session.id,
    expiresIn: deps.policy.accessSeconds,
    refreshExpiresAt: session.expiresAt,
  };
}
