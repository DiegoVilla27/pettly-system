import {
  object,
  strictObject,
  string,
  nullable,
  optional,
  uuid,
  email,
  iso,
  array,
  number,
  int,
  positive,
  minLength,
  maxLength,
  regex,
  refine,
  omit,
  enum as enumeration,
} from 'zod/mini';
import { countryCodes, type ApiResponse } from '@pettly/api-client';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import {
  statuses,
  types,
  defaultFilters,
  requiredProfileFields,
  requiredFieldLabels,
  type OrganizationDto,
  type OrganizationProfileDto,
  type OrganizationFilters,
  type Organization,
  type OrganizationProfile,
  type Page,
  type Member,
  type AuditEntry,
  type AccountOption,
} from '../models/organization';
export const countryOptions = (() => {
  const names = new Intl.DisplayNames(['es'], { type: 'region' });
  return countryCodes
    .map((value) => ({ value, label: names.of(value) ?? value }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
})();
const statusSchema = enumeration([
  'draft',
  'pending',
  'active',
  'rejected',
  'suspended',
  'deleted',
]);
const typeSchema = enumeration(['business', 'adoption_entity']);
export const textSchema = (max: number, min = 1) =>
  string().check(minLength(min), maxLength(max), regex(/^[^\p{Cc}]+$/u));
export const websiteSchema = string().check(
  maxLength(2048),
  refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  }),
);
export const registrationSchema = textSchema(60).check(
  refine((value) =>
    /^[A-Z0-9]{2,40}$/.test(value.toUpperCase().replace(/[\s.\-/]/g, '')),
  ),
);
export const profileChangesSchema = strictObject({
  name: optional(textSchema(150, 2)),
  legalName: optional(nullable(textSchema(150, 2))),
  registrationNumber: optional(nullable(registrationSchema)),
  description: optional(nullable(textSchema(2000))),
  email: optional(nullable(email().check(maxLength(254)))),
  phone: optional(nullable(string().check(regex(/^\+[1-9]\d{6,14}$/)))),
  website: optional(nullable(websiteSchema)),
  countryCode: optional(nullable(enumeration(countryCodes))),
  region: optional(nullable(textSchema(100))),
  city: optional(nullable(textSchema(100))),
  address: optional(nullable(textSchema(200))),
  addressLine2: optional(nullable(textSchema(200))),
  postalCode: optional(nullable(textSchema(20))),
});
export const versionSchema = number().check(
  int(),
  positive(),
  refine((value) => value <= 2147483647),
);
export const decisionSchema = strictObject({
  reason: reasonSchema,
  expectedVersion: versionSchema,
});
export const responsibleSchema = strictObject({
  ...decisionSchema.shape,
  responsibleUserId: uuid(),
});
export const createSchema = strictObject({
  name: textSchema(150, 2),
  type: typeSchema,
  reason: reasonSchema,
  profile: optional(omit(profileChangesSchema, { name: true })),
});
const identitySchema = object({
  id: uuid(),
  name: textSchema(150, 2),
  type: typeSchema,
  status: statusSchema,
  version: versionSchema,
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
});
const date = nullable(iso.datetime());
const profileSchema = object({
  ...identitySchema.shape,
  legalName: nullable(string()),
  registrationNumber: nullable(string()),
  description: nullable(string()),
  email: nullable(email()),
  phone: nullable(string()),
  website: nullable(websiteSchema),
  countryCode: nullable(enumeration(countryCodes)),
  region: nullable(string()),
  city: nullable(string()),
  address: nullable(string()),
  addressLine2: nullable(string()),
  postalCode: nullable(string()),
  applicantId: nullable(uuid()),
  responsibleUserId: nullable(uuid()),
  submittedAt: date,
  reviewedAt: date,
  reviewedBy: nullable(uuid()),
  reviewReason: nullable(string()),
  approvedAt: date,
  suspendedAt: date,
  deletedAt: date,
});
const memberSchema = object({
  id: uuid(),
  organizationId: uuid(),
  userId: uuid(),
  role: enumeration([
    'business_admin',
    'business_operator',
    'adoption_admin',
    'adoption_operator',
  ]),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
});
const auditSchema = object({
  id: uuid(),
  actorId: uuid(),
  organizationId: uuid(),
  targetUserId: nullable(uuid()),
  action: enumeration([
    'organization.created',
    'organization.requested',
    'organization.profile_updated',
    'organization.submitted',
    'organization.approved',
    'organization.rejected',
    'organization.status_changed',
    'organization.responsible_changed',
    'organization.deleted',
    'membership.role_assigned',
    'membership.role_removed',
  ]),
  previousValue: nullable(string()),
  nextValue: nullable(string()),
  reason: string(),
  requestId: textSchema(128),
  createdAt: iso.datetime(),
});
const accountSchema = object({
  id: uuid(),
  name: string(),
  lastName: nullable(string()),
  email: email(),
  status: enumeration(['active']),
  emailVerifiedAt: iso.datetime(),
});
function invalid(): never {
  throw new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar la información recibida. Actualiza la página.',
  );
}
export function mapOrganization(dto: OrganizationDto): Organization {
  const result = identitySchema.safeParse(dto);
  if (!result.success) return invalid();
  return {
    ...result.data,
    statusLabel:
      statuses.find((s) => s.value === result.data.status)?.label ?? '',
    typeLabel: types.find((t) => t.value === result.data.type)?.label ?? '',
  };
}
export function mapProfile(
  dto: OrganizationProfileDto,
  id: string,
): OrganizationProfile {
  const result = profileSchema.safeParse(dto);
  if (!result.success || result.data.id !== id) return invalid();
  return { ...result.data, ...mapOrganization(dto) };
}
export function checkPage(dto: {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}) {
  if (
    !object({
      items: array(object({})),
      total: number().check(
        int(),
        refine((value) => value >= 0),
      ),
      page: number().check(int(), positive()),
      limit: number().check(
        int(),
        positive(),
        refine((value) => value <= 100),
      ),
    }).safeParse(dto).success ||
    dto.items.length > dto.limit
  )
    invalid();
}
export function mapOrganizationPage(
  dto: Page<OrganizationDto>,
): Page<Organization> {
  checkPage(dto);
  return { ...dto, items: dto.items.map(mapOrganization) };
}
export function mapMembers(dto: Page<Member>, id: string): Page<Member> {
  checkPage(dto);
  if (
    dto.items.some(
      (item) =>
        !memberSchema.safeParse(item).success || item.organizationId !== id,
    )
  )
    invalid();
  return dto;
}
export function mapAudit(dto: Page<AuditEntry>, id: string): Page<AuditEntry> {
  checkPage(dto);
  if (
    dto.items.some(
      (item) =>
        !auditSchema.safeParse(item).success || item.organizationId !== id,
    )
  )
    invalid();
  return dto;
}
export function mapAccounts(
  dto: ApiResponse<'listUsers'>,
): Page<AccountOption> {
  checkPage(dto);
  const items = dto.items.map((item) => {
    const parsed = accountSchema.safeParse(item);
    if (!parsed.success) return invalid();
    return {
      id: parsed.data.id,
      fullName: [parsed.data.name, parsed.data.lastName]
        .filter(Boolean)
        .join(' '),
      email: parsed.data.email,
    };
  });
  return { ...dto, items };
}
export function missingProfile(profile: OrganizationProfileDto): string[] {
  return requiredProfileFields
    .filter((key) => !profile[key])
    .map((key) => requiredFieldLabels[key]);
}
export function parseFilters(params: {
  get(key: string): string | null;
}): OrganizationFilters {
  const filters: OrganizationFilters = { ...defaultFilters };
  const page = Number(params.get('page')),
    limit = Number(params.get('limit'));
  if (Number.isSafeInteger(page) && page >= 1 && page <= 100000)
    filters.page = page;
  if ([10, 20, 50, 100].includes(limit)) filters.limit = limit;
  const status = statusSchema.safeParse(params.get('status')),
    type = typeSchema.safeParse(params.get('type')),
    country = enumeration(countryCodes).safeParse(params.get('countryCode'));
  if (status.success) filters.status = status.data;
  if (type.success) filters.type = type.data;
  if (country.success) filters.countryCode = country.data;
  const search = params.get('search')?.trim();
  if (search && textSchema(100).safeParse(search).success)
    filters.search = search;
  return filters;
}
