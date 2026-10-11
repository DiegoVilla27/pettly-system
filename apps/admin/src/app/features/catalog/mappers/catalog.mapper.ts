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
  categoryStatuses,
  type CategoryDto,
  type Category,
  type CategoryCommand,
  type ProductDto,
  type Product,
  type ProductDetail,
  type Page,
  type Audit,
  type QueueFilters,
} from '../models/catalog';
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
export const createCategorySchema = strictObject({
  name: textSchema(100, 2),
  slug: slugSchema,
  description: optional(nullable(textSchema(1000, 2))),
  reason: reasonSchema,
});
export const updateCategorySchema = strictObject({
  profile: strictObject({
    name: optional(textSchema(100, 2)),
    slug: optional(slugSchema),
    description: optional(nullable(textSchema(1000, 2))),
    status: optional(enumeration(['active', 'inactive'])),
  }).check(refine((p) => Object.keys(p).length > 0)),
  reason: reasonSchema,
  expectedVersion: versionSchema,
});
export const reviewSchema = strictObject({
  approved: boolean(),
  reason: reasonSchema,
  expectedVersion: versionSchema,
});
const productSchema = object({
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
const variantSchema = object({
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
const labels: Record<ProductDto['status'], string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  published: 'Publicado',
  rejected: 'Rechazado',
  paused: 'Pausado',
  archived: 'Archivado',
};
const actions: Record<string, string> = {
  'category.created': 'Categoría creada',
  'category.updated': 'Categoría actualizada',
};
export function inputProblem() {
  return new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa los identificadores y los campos obligatorios.',
  );
}
function contractProblem() {
  return new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos validar la respuesta. Actualiza los datos antes de continuar.',
  );
}
export function mapCategory(dto: CategoryDto): Category {
  const parsed = categorySchema.safeParse(dto);
  if (!parsed.success) throw contractProblem();
  return {
    ...parsed.data,
    statusLabel:
      categoryStatuses.find((s) => s.value === parsed.data.status)?.label ??
      parsed.data.status,
  };
}
export function mapCategories(
  dto: ApiResponse<'listManagedCategories'>,
): Category[] {
  const parsed = object({
    items: array(categorySchema).check(maxLength(1000)),
  }).safeParse(dto);
  if (
    !parsed.success ||
    new Set(parsed.data.items.map((c) => c.id)).size !==
      parsed.data.items.length
  )
    throw contractProblem();
  return dto.items.map(mapCategory);
}
export function validCategoryCommand(command: CategoryCommand) {
  return (
    command.kind === 'create' ? createCategorySchema : updateCategorySchema
  ).safeParse(command.body).success;
}
export function mapProduct(dto: ProductDto, expectedId?: string): Product {
  const parsed = productSchema.safeParse(dto);
  if (!parsed.success || (expectedId && parsed.data.id !== expectedId))
    throw contractProblem();
  return { ...parsed.data, statusLabel: labels[parsed.data.status] };
}
export function mapQueue(
  dto: ApiResponse<'listProductModerationQueue'>,
): Page<Product> {
  const parsed = object({
    items: array(productSchema).check(maxLength(50)),
    total: number().check(int(), nonnegative()),
    page: number().check(int(), positive()),
    limit: number().check(
      int(),
      positive(),
      refine((n) => n <= 50),
    ),
  }).safeParse(dto);
  if (
    !parsed.success ||
    parsed.data.items.length > parsed.data.limit ||
    parsed.data.items.length > parsed.data.total ||
    parsed.data.items.some((p) => p.status !== 'pending')
  )
    throw contractProblem();
  return { ...parsed.data, items: dto.items.map((p) => mapProduct(p)) };
}
export function mapDetail(
  dto: ApiResponse<'getProductReviewPreview'>,
  id: string,
): ProductDetail {
  const parsed = object({
    product: productSchema,
    variants: array(variantSchema).check(maxLength(50)),
    photos: array(photoSchema).check(maxLength(10)),
  }).safeParse(dto);
  if (
    !parsed.success ||
    parsed.data.product.status !== 'pending' ||
    new Set(parsed.data.variants.map((v) => v.id)).size !==
      parsed.data.variants.length ||
    new Set(parsed.data.photos.map((p) => p.mediaId)).size !==
      parsed.data.photos.length ||
    parsed.data.variants.some(
      (v) =>
        v.productId !== id ||
        v.organizationId !== parsed.data.product.organizationId,
    ) ||
    parsed.data.photos.some((p) => p.productId !== id)
  )
    throw contractProblem();
  return {
    ...parsed.data,
    product: mapProduct(dto.product, id),
    photos: [...parsed.data.photos].sort((a, b) => a.position - b.position),
  };
}
export function mapCategoryAudit(
  dto: ApiResponse<'listCategoryAudit'>,
  id: string,
): Page<Audit> {
  const parsed = object({
    items: array(
      object({
        id: uuid(),
        actorId: uuid(),
        productId: nullable(uuid()),
        categoryId: nullable(uuid()),
        action: textSchema(100),
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
    !parsed.success ||
    parsed.data.items.some(
      (a) => a.categoryId !== id || a.productId !== null,
    ) ||
    parsed.data.items.length > parsed.data.total
  )
    throw contractProblem();
  return {
    ...parsed.data,
    items: parsed.data.items.map((a) => ({
      ...a,
      actionLabel: actions[a.action] ?? 'Cambio de categoría',
    })),
  };
}
export function parseQueue(params: ParamMap): QueueFilters {
  const search = params.get('search')?.trim();
  const organizationId = params.get('organizationId');
  const categoryId = params.get('categoryId');
  const page = Number(params.get('page') ?? 1),
    limit = Number(params.get('limit') ?? 20);
  return {
    page: Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 20,
    ...(search && search.length <= 100 && !/\p{Cc}/u.test(search)
      ? { search }
      : {}),
    ...(organizationId && uuid().safeParse(organizationId).success
      ? { organizationId }
      : {}),
    ...(categoryId && uuid().safeParse(categoryId).success
      ? { categoryId }
      : {}),
  };
}
export function moneyLabel(
  priceMinor: number,
  currency: ProductDto['currency'],
): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceMinor / 100);
}
