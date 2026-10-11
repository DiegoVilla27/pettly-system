import {
  object,
  string,
  nullable,
  uuid,
  email,
  iso,
  enum as enumeration,
  array,
  number,
  int,
  positive,
  minLength,
  maxLength,
  optional,
  strictObject,
  regex,
  refine,
} from 'zod/mini';
import { countryCodes, type ApiQuery } from '@pettly/api-client';
import { ApiProblem } from '../../../core/api';
export { reasonSchema } from '../../../shared/forms/audit-reason';
import {
  defaultFilters,
  globalRoles,
  type UserDto,
  type User,
  type UserAccess,
  type Page,
  type AuditEntry,
  type OrganizationOption,
  type UserFilters,
} from '../models/user';
const roles = enumeration(['user', 'moderator', 'super_admin']);
const statuses = enumeration(['active', 'disabled', 'deleted']);
const shortText = (max: number) =>
  string().check(minLength(1), maxLength(max), regex(/^[^\p{Cc}]+$/u));
export const nameSchema = shortText(100).check(
  regex(/^[\p{L}\p{M} .’'-]+$/u),
  refine((value) => /\p{L}/u.test(value)),
);
export const birthDateSchema = iso.date().check(
  refine((value) => {
    const today = new Date(),
      date = new Date(value + 'T00:00:00.000Z');
    const age =
      today.getUTCFullYear() -
      date.getUTCFullYear() -
      (today.toISOString().slice(5, 10) < value.slice(5) ? 1 : 0);
    return value <= today.toISOString().slice(0, 10) && age <= 120;
  }),
);
export const profileSchema = strictObject({
  name: optional(nameSchema),
  lastName: optional(nameSchema),
  dateOfBirth: optional(nullable(birthDateSchema)),
  phone: optional(nullable(string().check(regex(/^\+[1-9]\d{6,14}$/)))),
  address: optional(nullable(shortText(200))),
  addressLine2: optional(nullable(shortText(200))),
  countryCode: optional(nullable(enumeration(countryCodes))),
  region: optional(nullable(shortText(100))),
  city: optional(nullable(shortText(100))),
  postalCode: optional(nullable(shortText(20))),
});
export const userSchema = object({
  id: uuid(),
  email: email(),
  name: string().check(minLength(1), maxLength(100)),
  lastName: nullable(string()),
  dateOfBirth: nullable(iso.date()),
  age: nullable(number().check(int())),
  phone: nullable(string()),
  address: nullable(string()),
  addressLine2: nullable(string()),
  countryCode: nullable(enumeration(countryCodes)),
  region: nullable(string()),
  city: nullable(string()),
  postalCode: nullable(string()),
  status: statuses,
  globalRole: roles,
  emailVerifiedAt: nullable(iso.datetime()),
  deletedAt: nullable(iso.datetime()),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
});
const membershipSchema = object({
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
    'deleted',
  ]),
  permissions: array(string()),
});
const accessSchema = object({
  userId: uuid(),
  globalRole: roles,
  globalPermissions: array(string()),
  organizations: array(membershipSchema),
});
const auditSchema = object({
  id: uuid(),
  actorId: nullable(uuid()),
  targetId: uuid(),
  action: string(),
  previousValue: string(),
  nextValue: string(),
  reason: string(),
  requestId: nullable(uuid()),
  createdAt: iso.datetime(),
});
const organizationSchema = object({
  id: uuid(),
  name: string(),
  type: enumeration(['business', 'adoption_entity']),
  status: membershipSchema.shape.status,
  version: number().check(int(), positive()),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
});
function invalidResponse(): never {
  throw new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar la información recibida. Inténtalo nuevamente.',
  );
}
export function mapUser(dto: UserDto): User {
  const parsed = userSchema.safeParse(dto);
  if (!parsed.success) return invalidResponse();
  const fullName = [parsed.data.name, parsed.data.lastName]
    .filter(Boolean)
    .join(' ');
  return {
    ...parsed.data,
    fullName,
    initials: fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase(),
    roleLabel:
      globalRoles.find((role) => role.value === parsed.data.globalRole)
        ?.label ?? 'Usuario',
    statusLabel: {
      active: 'Activo',
      disabled: 'Deshabilitado',
      deleted: 'Eliminado',
    }[parsed.data.status],
  };
}
export function mapUserPage(dto: Page<UserDto>): Page<User> {
  checkPage(dto);
  return { ...dto, items: dto.items.map(mapUser) };
}
function checkPage(dto: {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}) {
  const parsed = object({
    items: array(object({})),
    total: number().check(
      int(),
      refine((n) => n >= 0),
    ),
    page: number().check(int(), positive()),
    limit: number().check(int(), positive()),
  }).safeParse(dto);
  if (!parsed.success) invalidResponse();
}
export function mapAccess(dto: UserAccess, userId: string): UserAccess {
  if (!accessSchema.safeParse(dto).success || dto.userId !== userId)
    invalidResponse();
  return dto;
}
export function mapAuditPage(
  dto: Page<AuditEntry>,
  userId: string,
): Page<AuditEntry> {
  checkPage(dto);
  if (
    dto.items.some(
      (item) =>
        !auditSchema.safeParse(item).success || item.targetId !== userId,
    )
  )
    invalidResponse();
  return dto;
}
export function mapOrganizationPage(
  dto: Page<OrganizationOption>,
): Page<OrganizationOption> {
  checkPage(dto);
  if (dto.items.some((item) => !organizationSchema.safeParse(item).success))
    invalidResponse();
  return dto;
}
export function parseFilters(params: {
  get(name: string): string | null;
}): UserFilters {
  const filters: UserFilters = { ...defaultFilters };
  const page = Number(params.get('page'));
  if (Number.isSafeInteger(page) && page >= 1 && page <= 100000)
    filters.page = page;
  const limit = Number(params.get('limit'));
  if ([10, 20, 50, 100].includes(limit)) filters.limit = limit;
  const status = statuses.safeParse(params.get('status'));
  if (status.success) filters.status = status.data;
  const role = roles.safeParse(params.get('role'));
  if (role.success) filters.role = role.data;
  const org = membershipSchema.shape.role.safeParse(
    params.get('organizationRole'),
  );
  if (org.success) filters.organizationRole = org.data;
  const verified = params.get('emailVerified');
  if (verified === 'true' || verified === 'false')
    filters.emailVerified = verified;
  const search = params.get('search')?.trim();
  if (search && search.length <= 100 && !/\p{Cc}/u.test(search))
    filters.search = search;
  const sort = enumeration(['createdAt', 'email', 'name']).safeParse(
    params.get('sortBy'),
  );
  if (sort.success) filters.sortBy = sort.data;
  if (params.get('sortOrder') === 'asc') filters.sortOrder = 'asc';
  return filters;
}
export function filtersQuery(filters: UserFilters): ApiQuery<'listUsers'> {
  return { ...filters };
}
