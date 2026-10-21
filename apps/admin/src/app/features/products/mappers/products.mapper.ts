import {
  object,
  strictObject,
  string,
  uuid,
  number,
  int,
  positive,
  nonnegative,
  maxLength,
  minLength,
  regex,
  array,
  nullable,
  optional,
  record,
  iso,
  refine,
  enum as enumeration,
} from 'zod/mini';
import type { ParamMap } from '@angular/router';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import type {
  Product,
  ProductDetail,
  ProductPage,
  ProductAudit,
  Profile,
  Category,
  Context,
  Filters,
  Company,
} from '../models/product';
export const textSchema = (max: number, min = 1) =>
  string().check(minLength(min), maxLength(max), regex(/^[^\p{Cc}]+$/u));
export const versionSchema = number().check(
  int(),
  positive(),
  refine((n) => n <= 2147483647),
);
export const slugSchema = string().check(
  minLength(1),
  maxLength(100),
  regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
);
const categorySchema = object({
  id: uuid(),
  name: textSchema(100, 2),
  slug: slugSchema,
  description: nullable(textSchema(1000, 2)),
  status: enumeration(['active', 'inactive', 'archived']),
  version: versionSchema,
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
});
export const productSchema = object({
  id: uuid(),
  organizationId: uuid(),
  categoryId: uuid(),
  name: textSchema(150, 2),
  description: textSchema(4000, 10),
  brand: nullable(textSchema(100)),
  currency: enumeration(['COP', 'USD', 'EUR']),
  version: versionSchema,
  status: enumeration([
    'draft',
    'pending',
    'published',
    'rejected',
    'paused',
    'archived',
  ]),
  createdBy: uuid(),
  reviewedBy: nullable(uuid()),
  reviewedAt: nullable(iso.datetime()),
  reviewReason: nullable(reasonSchema),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
});
export const variantSchema = object({
  id: uuid(),
  productId: uuid(),
  organizationId: uuid(),
  sku: string().check(maxLength(64), regex(/^[A-Z0-9][A-Z0-9._-]*$/)),
  priceMinor: number().check(
    int(),
    positive(),
    refine((n) => n <= 2147483647),
  ),
  attributes: record(
    string().check(regex(/^[a-z][a-z0-9_]{0,29}$/)),
    textSchema(80),
  ).check(refine((a) => Object.keys(a).length <= 10)),
  status: enumeration(['active', 'archived']),
  createdAt: iso.datetime(),
  updatedAt: iso.datetime(),
});
const photoSchema = object({
  id: uuid(),
  productId: uuid(),
  mediaId: uuid(),
  position: number().check(int(), nonnegative()),
  createdAt: iso.datetime(),
});

export const invalid = () =>
  new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa la empresa, el producto y los campos obligatorios.',
  );
export const contract = () =>
  new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar el producto. Actualiza y revisa antes de continuar.',
  );
export const contextSchema = strictObject({
  organizationId: uuid(),
  productId: uuid(),
});
export const decisionSchema = strictObject({
  reason: reasonSchema,
  expectedVersion: versionSchema,
});
export const profileSchema = strictObject({
  name: textSchema(150, 2),
  description: textSchema(4000, 10),
  brand: nullable(textSchema(100)),
  categoryId: uuid(),
});
export const variantProfileSchema = strictObject({
  sku: string().check(
    minLength(1),
    maxLength(64),
    regex(/^[A-Z0-9][A-Z0-9._-]*$/),
  ),
  priceMinor: number().check(
    int(),
    positive(),
    refine((n) => n <= 2147483647),
  ),
  attributes: record(
    string().check(regex(/^[a-z][a-z0-9_]{0,29}$/)),
    textSchema(80),
  ).check(refine((a) => Object.keys(a).length <= 10)),
});
export const filtersSchema = strictObject({
  organizationId: uuid(),
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
  search: optional(textSchema(100)),
  status: optional(
    enumeration([
      'draft',
      'pending',
      'published',
      'rejected',
      'paused',
      'archived',
    ]),
  ),
  categoryId: optional(uuid()),
});
export function mapCompany(dto: unknown): Company {
  const v = object({
    id: uuid(),
    name: textSchema(150),
    type: enumeration(['business']),
    status: enumeration(['active']),
  }).safeParse(dto);
  if (!v.success)
    throw new ApiProblem(
      403,
      'FORBIDDEN',
      'Selecciona una empresa activa con acceso al catálogo.',
    );
  return { id: v.data.id, name: v.data.name };
}
export function mapCategories(dto: unknown): Category[] {
  const v = object({
    items: array(categorySchema).check(maxLength(1000)),
  }).safeParse(dto);
  if (
    !v.success ||
    v.data.items.some((c) => c.status !== 'active') ||
    new Set(v.data.items.map((c) => c.id)).size !== v.data.items.length
  )
    throw contract();
  return v.data.items;
}
export function mapProduct(dto: unknown, c?: Context): Product {
  const v = productSchema.safeParse(dto);
  if (
    !v.success ||
    (c &&
      (v.data.id !== c.productId || v.data.organizationId !== c.organizationId))
  )
    throw contract();
  return v.data;
}
export function mapDetail(dto: unknown, c: Context): ProductDetail {
  const v = object({
    product: productSchema,
    variants: array(variantSchema).check(maxLength(50)),
    photos: array(photoSchema).check(maxLength(10)),
  }).safeParse(dto);
  if (
    !v.success ||
    v.data.product.id !== c.productId ||
    v.data.product.organizationId !== c.organizationId ||
    v.data.variants.some(
      (x) =>
        x.productId !== c.productId || x.organizationId !== c.organizationId,
    ) ||
    v.data.photos.some((x) => x.productId !== c.productId) ||
    new Set(v.data.variants.map((x) => x.id)).size !== v.data.variants.length ||
    new Set(v.data.photos.map((x) => x.mediaId)).size !== v.data.photos.length
  )
    throw contract();
  return {
    ...v.data,
    photos: [...v.data.photos].sort((a, b) => a.position - b.position),
  };
}
export function mapPage(dto: unknown, f: Filters): ProductPage {
  const v = object({
    items: array(
      object({
        product: productSchema,
        variants: array(variantSchema).check(maxLength(50)),
        photos: array(photoSchema).check(maxLength(10)),
      }),
    ).check(maxLength(50)),
    total: number().check(int(), nonnegative()),
    page: number().check(int(), positive()),
    limit: number().check(int(), positive()),
  }).safeParse(dto);
  if (
    !v.success ||
    v.data.page !== f.page ||
    v.data.limit !== f.limit ||
    v.data.items.length > f.limit ||
    v.data.total < v.data.items.length ||
    new Set(v.data.items.map((x) => x.product.id)).size !==
      v.data.items.length ||
    v.data.items.some(
      (x) =>
        (f.status && x.product.status !== f.status) ||
        (f.categoryId && x.product.categoryId !== f.categoryId),
    )
  )
    throw contract();
  return {
    ...v.data,
    items: v.data.items.map((x) =>
      mapDetail(x, {
        organizationId: f.organizationId,
        productId: x.product.id,
      }),
    ),
  };
}
export function mapAudit(dto: unknown, c: Context, page: number): ProductAudit {
  const v = object({
    items: array(
      object({
        id: uuid(),
        actorId: uuid(),
        productId: uuid(),
        categoryId: nullable(uuid()),
        action: enumeration([
          'product.created',
          'product.submit',
          'product.review',
          'product.pause',
          'product.archive',
          'product.updated',
          'product.submitted',
          'product.approved',
          'product.rejected',
          'product.paused',
          'product.archived',
          'variant.created',
          'variant.updated',
          'variant.archived',
          'photo.created',
          'photo.removed',
        ]),
        reason: reasonSchema,
        requestId: uuid(),
        createdAt: iso.datetime(),
      }),
    ).check(maxLength(20)),
    total: number().check(int(), nonnegative()),
    page: number().check(int(), positive()),
    limit: number().check(int(), positive()),
  }).safeParse(dto);
  if (
    !v.success ||
    v.data.page !== page ||
    v.data.limit !== 20 ||
    v.data.total < v.data.items.length ||
    v.data.items.some(
      (x) => x.productId !== c.productId || x.categoryId !== null,
    ) ||
    new Set(v.data.items.map((x) => x.id)).size !== v.data.items.length
  )
    throw contract();
  return v.data;
}
export function validateProfile(dto: unknown): Profile {
  const v = profileSchema.safeParse(dto);
  if (!v.success) throw invalid();
  return v.data;
}
export function parseFilters(p: ParamMap): Filters | null {
  const v = filtersSchema.safeParse({
    organizationId: p.get('organizationId'),
    page: Number(p.get('page') ?? 1),
    limit: Number(p.get('limit') ?? 20),
    search: p.get('search')?.trim() || undefined,
    status: p.get('status') || undefined,
    categoryId: p.get('categoryId') || undefined,
  });
  return v.success ? v.data : null;
}
