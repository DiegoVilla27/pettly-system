import {
  object,
  strictObject,
  uuid,
  optional,
  number,
  int,
  refine,
  string,
  minLength,
  maxLength,
  regex,
  nullable,
  iso,
  enum as enumeration,
  array,
  email,
} from 'zod/mini';
import type {
  AdoptionRequest,
  RequestItem,
  RequestPage,
  RequestContext,
  RequestFilters,
} from '../models/adoption-request';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import { contract, invalid } from './publications.mapper';
const integer = (min: number, max: number) =>
  number().check(
    int(),
    refine((n) => n >= min && n <= max),
  );
const version = integer(1, 2147483647);
const text = (min: number, max: number) =>
  string().check(minLength(min), maxLength(max), regex(/^[^\p{Cc}]+$/u));
export const requestStatusSchema = enumeration([
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'withdrawn',
  'completed',
  'closed',
]);
export const requestContextSchema = strictObject({
  organizationId: uuid(),
  publicationId: uuid(),
  adoptionRequestId: optional(uuid()),
});
export const requestFiltersSchema = strictObject({
  organizationId: uuid(),
  publicationId: uuid(),
  page: integer(1, 100000),
  limit: integer(1, 100),
  status: optional(requestStatusSchema),
});
const fields = {
  id: uuid(),
  publicationId: uuid(),
  applicantId: uuid(),
  message: text(10, 2000),
  consentedAt: iso.datetime(),
  publicationVersion: version,
  conditionsAccepted: text(2, 2000),
  status: requestStatusSchema,
  version,
  reviewedBy: nullable(uuid()),
  reviewedAt: nullable(iso.datetime()),
  reviewReason: nullable(text(1, 500)),
  completedAt: nullable(iso.datetime()),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
};
const item = object(fields);
const detail = object({
  ...fields,
  contact: nullable(
    object({
      name: text(1, 100),
      lastName: nullable(text(1, 100)),
      email: email(),
      phone: nullable(string().check(regex(/^\+[1-9]\d{7,14}$/))),
      countryCode: nullable(string().check(regex(/^[A-Z]{2}$/))),
      city: nullable(text(1, 100)),
    }),
  ),
});
export function validateRequestContext(c: RequestContext, requireId = false) {
  if (
    !requestContextSchema.safeParse(c).success ||
    (requireId && !c.adoptionRequestId)
  )
    throw invalid();
}
export function mapRequest(dto: unknown, c: RequestContext): AdoptionRequest {
  const r = detail.safeParse(dto);
  if (
    !r.success ||
    r.data.publicationId !== c.publicationId ||
    r.data.id !== c.adoptionRequestId ||
    Date.parse(r.data.updatedAt) < Date.parse(r.data.createdAt)
  )
    throw contract();
  return r.data;
}
export function mapRequestItem(dto: unknown, c: RequestContext): RequestItem {
  const r = item.safeParse(dto);
  if (
    !r.success ||
    r.data.publicationId !== c.publicationId ||
    (c.adoptionRequestId && r.data.id !== c.adoptionRequestId)
  )
    throw contract();
  return r.data;
}
export function mapRequestPage(dto: unknown, f: RequestFilters): RequestPage {
  const r = object({
    items: array(item).check(maxLength(100)),
    page: integer(1, 100000),
    limit: integer(1, 100),
    total: integer(0, Number.MAX_SAFE_INTEGER),
  }).safeParse(dto);
  if (
    !r.success ||
    r.data.page !== f.page ||
    r.data.limit !== f.limit ||
    r.data.items.length > f.limit ||
    r.data.total < r.data.items.length ||
    new Set(r.data.items.map((x) => x.id)).size !== r.data.items.length ||
    r.data.items.some(
      (x) =>
        x.publicationId !== f.publicationId ||
        (f.status && x.status !== f.status),
    )
  )
    throw contract();
  return r.data;
}

export const reviewRequestSchema = strictObject({
  status: enumeration(['in_review', 'approved', 'rejected']),
  reason: reasonSchema,
  expectedVersion: version,
});
