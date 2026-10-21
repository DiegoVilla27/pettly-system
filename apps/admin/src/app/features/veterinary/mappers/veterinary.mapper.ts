import {
  object,
  strictObject,
  string,
  uuid,
  number,
  int,
  positive,
  nonnegative,
  minLength,
  maxLength,
  regex,
  array,
  literal,
  nullable,
  boolean,
  iso,
  refine,
  enum as enumeration,
} from 'zod/mini';
import type { ParamMap } from '@angular/router';
import type { ApiResponse } from '@pettly/api-client';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import {
  statuses,
  defaultFilters,
  type CredentialDto,
  type Credential,
  type CredentialFilters,
  type CredentialAudit,
  type Page,
} from '../models/credential';
const status = enumeration([
  'draft',
  'pending',
  'approved',
  'rejected',
  'revoked',
]);
const profession = enumeration(['veterinarian', 'veterinarian_zootechnician']);
const date = iso.datetime();
export const versionSchema = number().check(
  int(),
  positive(),
  refine((v) => v <= 2147483647),
);
export const textSchema = (max: number, min = 1) =>
  string().check(minLength(min), maxLength(max), regex(/^[^\p{Cc}]+$/u));
const credentialSchema = object({
  id: uuid(),
  organizationId: uuid(),
  professionalId: uuid(),
  resourceId: uuid(),
  profession,
  registrationNumber: string().check(regex(/^\d{1,15}$/)),
  university: textSchema(150, 2),
  consent: literal(true),
  version: versionSchema,
  status,
  documents: array(
    object({
      mediaId: uuid(),
      kind: enumeration([
        'professional_card',
        'qualification',
        'standing_certificate',
      ]),
    }),
  ).check(maxLength(6)),
  reviewedBy: nullable(uuid()),
  reviewedAt: nullable(date),
  verifiedUntil: nullable(date),
  verificationReference: nullable(textSchema(500, 10)),
  createdAt: date,
  updatedAt: date,
});
export const decisionSchema = strictObject({
  reason: reasonSchema,
  expectedVersion: versionSchema,
});
export const reviewSchema = strictObject({
  ...decisionSchema.shape,
  approved: boolean(),
  officialRegisterChecked: literal(true),
  verifiedUntil: nullable(date),
  verificationReference: nullable(textSchema(500, 10)),
}).check(
  refine(
    (v) =>
      !v.approved ||
      (!!v.verifiedUntil &&
        !!v.verificationReference &&
        validDeadline(v.verifiedUntil)),
  ),
);
export function validDeadline(value: string, now = Date.now()): boolean {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    timestamp > now &&
    timestamp <= now + 90 * 86400000
  );
}
export function localDeadline(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(+date) || toLocalDate(date) !== value) return null;
  return date.toISOString();
}
export function toLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function inputProblem() {
  return new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa los identificadores, la decisión y los campos obligatorios.',
  );
}
function contractProblem() {
  return new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar la respuesta. Actualiza los datos antes de continuar.',
  );
}
export function mapCredential(
  dto: CredentialDto,
  expectedId?: string,
): Credential {
  const result = credentialSchema.safeParse(dto);
  if (
    !result.success ||
    (expectedId && result.data.id !== expectedId) ||
    new Set(result.data.documents.map((d) => d.mediaId)).size !==
      result.data.documents.length ||
    (result.data.status === 'approved' &&
      (!result.data.reviewedBy ||
        !result.data.reviewedAt ||
        !result.data.verifiedUntil ||
        !result.data.verificationReference))
  )
    throw contractProblem();
  return {
    ...result.data,
    statusLabel:
      statuses.find((s) => s.value === result.data.status)?.label ??
      result.data.status,
    professionLabel:
      result.data.profession === 'veterinarian'
        ? 'Medicina veterinaria'
        : 'Medicina veterinaria y zootecnia',
  };
}
export function mapPage(
  dto: ApiResponse<'listVeterinaryCredentials'>,
): Page<Credential> {
  const parsed = object({
    items: array(credentialSchema).check(maxLength(50)),
    total: number().check(int(), nonnegative()),
    page: number().check(
      int(),
      positive(),
      refine((n) => n <= 10000),
    ),
    limit: number().check(
      int(),
      positive(),
      refine((n) => n <= 50),
    ),
  }).safeParse(dto);
  if (
    !parsed.success ||
    parsed.data.items.length > parsed.data.limit ||
    parsed.data.items.length > parsed.data.total
  )
    throw contractProblem();
  return { ...parsed.data, items: dto.items.map((d) => mapCredential(d)) };
}
const actions: Record<string, string> = {
  created: 'Acreditación creada',
  configured: 'Perfil actualizado',
  document_added: 'Evidencia adjuntada',
  document_removed: 'Evidencia retirada',
  submit: 'Solicitud enviada',
  approved: 'Acreditación aprobada',
  rejected: 'Solicitud rechazada',
  revoke: 'Acreditación revocada',
};
export function mapAudit(
  dto: ApiResponse<'listVeterinaryCredentialAudit'>,
  credentialId: string,
  page: number,
): Page<CredentialAudit> {
  const parsed = object({
    total: number().check(int(), nonnegative()),
    items: array(
      object({
        id: uuid(),
        credentialId: uuid(),
        actorId: uuid(),
        action: textSchema(100),
        version: versionSchema,
        snapshot: credentialSchema,
        reason: reasonSchema,
        requestId: textSchema(150),
        createdAt: date,
      }),
    ).check(maxLength(20)),
  }).safeParse(dto);
  if (!parsed.success || parsed.data.items.length > parsed.data.total)
    throw contractProblem();
  return {
    total: dto.total,
    page,
    limit: 20,
    items: dto.items.map((entry) => {
      if (
        entry.credentialId !== credentialId ||
        entry.snapshot.id !== credentialId ||
        entry.version !== entry.snapshot.version
      )
        throw contractProblem();
      return {
        ...entry,
        snapshot: mapCredential(entry.snapshot, credentialId),
        actionLabel:
          entry.action === 'review'
            ? entry.snapshot.status === 'approved'
              ? 'Acreditación aprobada'
              : 'Solicitud rechazada'
            : (actions[entry.action] ?? 'Cambio de acreditación'),
      };
    }),
  };
}
export function parseFilters(params: ParamMap): CredentialFilters {
  const s = status.safeParse(params.get('status'));
  const id = uuid().safeParse(params.get('organizationId'));
  const page = Number(params.get('page') ?? 1),
    limit = Number(params.get('limit') ?? 20);
  return {
    ...defaultFilters,
    page: Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 20,
    ...(s.success ? { status: s.data } : {}),
    ...(id.success ? { organizationId: id.data } : {}),
  };
}

export const preparationProfileSchema = strictObject({
  profession,
  registrationNumber: string().check(regex(/^\d{1,15}$/)),
  university: textSchema(150, 2),
  consent: literal(true),
});
export const preparationIdentitySchema = {
  organizationId: uuid(),
  professionalId: uuid(),
  resourceId: uuid(),
};
export const createCredentialSchema = strictObject({
  ...preparationIdentitySchema,
  profile: preparationProfileSchema,
  reason: reasonSchema,
});
export const configureCredentialSchema = strictObject({
  ...createCredentialSchema.shape,
  expectedVersion: versionSchema,
});
