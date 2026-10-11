import {
  object,
  string,
  minLength,
  literal,
  number,
  int,
  positive,
  uuid,
  nullable,
  email,
  enum as enumeration,
  iso,
  array,
} from 'zod/mini';
import type { ApiResponse } from '@pettly/api-client';
import type { GlobalRole, SessionIdentity } from '../models/session';
import { ApiProblem } from '../../api/api-problem';
const authSchema = object({
  accessToken: string().check(minLength(1)),
  tokenType: literal('Bearer'),
  expiresIn: number().check(int(), positive()),
  sessionId: uuid(),
});
const userSchema = object({
  id: uuid(),
  name: string().check(minLength(1)),
  lastName: nullable(string()),
  email: email(),
  globalRole: enumeration(['user', 'moderator', 'super_admin']),
  status: literal('active'),
  emailVerifiedAt: iso.datetime(),
});
const accessSchema = object({
  userId: uuid(),
  globalRole: userSchema.shape.globalRole,
  globalPermissions: array(string()),
  organizations: array(
    object({
      organizationId: uuid(),
      name: string(),
      type: enumeration(['business', 'adoption_entity']),
      role: enumeration([
        'business_admin',
        'business_operator',
        'adoption_admin',
        'adoption_operator',
      ]),
      status: enumeration([
        'draft',
        'pending',
        'active',
        'rejected',
        'suspended',
        'archived',
        'deleted',
      ]),
      permissions: array(string()),
    }),
  ),
});
const roleLabels: Record<GlobalRole, string> = {
  user: 'Miembro',
  moderator: 'Moderación',
  super_admin: 'Superadministración',
};
export function mapAuthResponse(dto: ApiResponse<'login'>) {
  const result = authSchema.safeParse(dto);
  if (!result.success || 'refreshToken' in dto)
    throw new ApiProblem(
      502,
      'INVALID_RESPONSE',
      'No pudimos validar la sesión. Inténtalo nuevamente.',
    );
  return {
    accessToken: result.data.accessToken,
    expiresAt: Date.now() + result.data.expiresIn * 1000,
  };
}
export function mapSession(
  user: ApiResponse<'getCurrentUser'>,
  access: ApiResponse<'getCurrentUserAccess'>,
): SessionIdentity {
  const u = userSchema.safeParse(user),
    a = accessSchema.safeParse(access);
  if (
    !u.success ||
    !a.success ||
    u.data.id !== a.data.userId ||
    u.data.globalRole !== a.data.globalRole
  )
    throw new ApiProblem(
      502,
      'INVALID_RESPONSE',
      'No pudimos validar tu acceso. Inténtalo nuevamente.',
    );
  const fullName = [u.data.name, u.data.lastName].filter(Boolean).join(' ');
  return {
    id: u.data.id,
    name: u.data.name,
    fullName,
    initials: fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase(),
    email: u.data.email,
    role: u.data.globalRole,
    roleLabel: roleLabels[u.data.globalRole],
    verified: true,
    globalPermissions: [...access.globalPermissions],
    organizations: structuredClone(access.organizations),
    backofficeAllowed:
      access.globalRole !== 'user' ||
      access.organizations.some((o) => o.status !== 'deleted'),
  };
}
