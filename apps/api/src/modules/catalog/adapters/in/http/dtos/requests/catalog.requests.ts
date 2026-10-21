import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^[^\p{Cc}]+$/u);
export const reason = text(10, 500).meta({
  description: 'Audited justification. Do not include credentials.',
  example: 'Catalog updated after the supplier review.',
});
export const version = z
  .number()
  .int()
  .min(1)
  .max(2147483647)
  .meta({ description: 'Current resource version. Stale changes return 409.' });
export const pagination = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};
export const productProfile = z.strictObject({
  name: text(2, 150),
  description: text(10, 4000),
  brand: text(1, 100).nullable(),
  categoryId: z.uuid(),
});
export const variantProfile = z.strictObject({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(1)
    .max(64)
    .regex(/^[A-Z0-9][A-Z0-9._-]*$/),
  priceMinor: z.number().int().min(1).max(2147483647).meta({
    description:
      'Price in currency minor units (100 minor units = 1 COP/USD/EUR). No floating-point amounts.',
    example: 1250000,
  }),
  attributes: z
    .record(z.string().regex(/^[a-z][a-z0-9_]{0,29}$/), text(1, 80))
    .refine((v) => Object.keys(v).length <= 10),
});
const categoryFields = {
  name: text(2, 100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: text(2, 1000).nullable(),
};
export class CreateCategoryDto extends createZodDto(
  z.strictObject({
    ...categoryFields,
    description: categoryFields.description.default(null),
    reason,
  }),
) {}
export class UpdateCategoryDto extends createZodDto(
  z.strictObject({
    profile: z
      .strictObject({
        ...categoryFields,
        status: z.enum(['active', 'inactive', 'archived']),
      })
      .partial()
      .refine((v) => Object.keys(v).length > 0),
    reason,
    expectedVersion: version,
  }),
) {}
export class CreateProductDto extends createZodDto(
  z.strictObject({
    organizationId: z.uuid(),
    profile: productProfile.extend({
      brand: productProfile.shape.brand.default(null),
    }),
    currency: z.enum(['COP', 'USD', 'EUR']).default('COP'),
    reason,
  }),
) {}
export class UpdateProductDto extends createZodDto(
  z.strictObject({
    profile: productProfile.partial().refine((v) => Object.keys(v).length > 0),
    reason,
    expectedVersion: version,
  }),
) {}
export class ProductDecisionDto extends createZodDto(
  z.strictObject({ reason, expectedVersion: version }),
) {}
export class ProductReviewDto extends createZodDto(
  z.strictObject({ reason, expectedVersion: version, approved: z.boolean() }),
) {}
export class CreateVariantDto extends createZodDto(
  z.strictObject({
    profile: variantProfile.extend({
      attributes: variantProfile.shape.attributes.default({}),
    }),
    reason,
    expectedVersion: version,
  }),
) {}
export class UpdateVariantDto extends createZodDto(
  z.strictObject({
    profile: variantProfile.partial().refine((v) => Object.keys(v).length > 0),
    reason,
    expectedVersion: version,
  }),
) {}
export class ProductPhotoUploadDto extends createZodDto(
  z.strictObject({
    reason,
    expectedVersion: z.coerce.number().int().min(1).max(2147483647),
  }),
) {}
export class ProductParamsDto extends createZodDto(
  z.strictObject({ productId: z.uuid() }),
) {}
export class CategoryParamsDto extends createZodDto(
  z.strictObject({ categoryId: z.uuid() }),
) {}
export class VariantParamsDto extends createZodDto(
  z.strictObject({ productId: z.uuid(), variantId: z.uuid() }),
) {}
export class ProductPhotoParamsDto extends createZodDto(
  z.strictObject({ productId: z.uuid(), mediaId: z.uuid() }),
) {}
export class CatalogPaginationDto extends createZodDto(
  z.strictObject(pagination),
) {}
const queryFields = {
  ...pagination,
  search: text(1, 100).optional(),
  categoryId: z.uuid().optional(),
  organizationId: z.uuid().optional(),
  brand: text(1, 100).optional(),
  currency: z.enum(['COP', 'USD', 'EUR']).optional(),
  minPriceMinor: z.coerce.number().int().min(1).max(2147483647).optional(),
  maxPriceMinor: z.coerce.number().int().min(1).max(2147483647).optional(),
};
export class PublicCatalogQueryDto extends createZodDto(
  z
    .strictObject(queryFields)
    .refine(
      (v) =>
        v.minPriceMinor === undefined ||
        v.maxPriceMinor === undefined ||
        v.minPriceMinor <= v.maxPriceMinor,
      { message: 'Minimum price must not exceed maximum price.' },
    )
    .refine(
      (v) =>
        (v.minPriceMinor === undefined && v.maxPriceMinor === undefined) ||
        v.currency !== undefined,
      { message: 'Price filters require a currency.' },
    ),
) {}
export class PrivateCatalogQueryDto extends createZodDto(
  z.strictObject({
    ...queryFields,
    organizationId: z.uuid(),
    status: z
      .enum(['draft', 'pending', 'published', 'rejected', 'paused', 'archived'])
      .optional(),
  }),
) {}
