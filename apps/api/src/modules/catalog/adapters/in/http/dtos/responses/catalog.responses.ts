import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
const id = z.uuid(),
  date = z.iso.datetime();
const text = z.string();
export const category = z.strictObject({
  id,
  name: text,
  slug: text,
  description: text.nullable(),
  status: z.enum(['active', 'inactive', 'archived']),
  version: z.number().int().positive(),
  createdAt: date,
  updatedAt: date,
});
export const publicProduct = z.strictObject({
  id,
  organizationId: id,
  categoryId: id,
  name: text,
  description: text,
  brand: text.nullable(),
  currency: z.enum(['COP', 'USD', 'EUR']),
  version: z.number().int().positive(),
});
export const product = publicProduct.extend({
  status: z.enum([
    'draft',
    'pending',
    'published',
    'rejected',
    'paused',
    'archived',
  ]),
  createdBy: id,
  reviewedBy: id.nullable(),
  reviewedAt: date.nullable(),
  reviewReason: text.nullable(),
  createdAt: date,
  updatedAt: date,
});
export const variant = z.strictObject({
  id,
  productId: id,
  organizationId: id,
  sku: text,
  priceMinor: z.number().int().positive(),
  attributes: z.record(text, text),
  status: z.enum(['active', 'archived']),
  createdAt: date,
  updatedAt: date,
});
export const photo = z.strictObject({
  id,
  productId: id,
  mediaId: id,
  position: z.number().int().nonnegative(),
  createdAt: date,
});
export const publicDetail = z.strictObject({
    product: publicProduct,
    variants: z.array(variant).max(50),
    photos: z.array(photo).max(10),
  }),
  privateDetail = z.strictObject({
    product,
    variants: z.array(variant).max(50),
    photos: z.array(photo).max(10),
  });
export class CategoryResponseDto extends createZodDto(category) {}
export class CategoriesResponseDto extends createZodDto(
  z.strictObject({ items: z.array(category).max(1000) }),
) {}
export class ProductResponseDto extends createZodDto(product) {}
export class PrivateProductDetailDto extends createZodDto(privateDetail) {}
export class PublicProductDetailDto extends createZodDto(publicDetail) {}
export class VariantChangeResponseDto extends createZodDto(
  z.strictObject({ product, variant }),
) {}
export class PhotoChangeResponseDto extends createZodDto(
  z.strictObject({ product, photo }),
) {}
export class PublicProductsResponseDto extends createZodDto(
  z.strictObject({
    items: z.array(publicDetail).max(50),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    nextPage: z.number().int().positive().nullable(),
  }),
) {}
export class PrivateProductsResponseDto extends createZodDto(
  z.strictObject({
    items: z.array(privateDetail).max(50),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
) {}
export class ModerationProductsResponseDto extends createZodDto(
  z.strictObject({
    items: z.array(product).max(50),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
) {}
export class CatalogAuditResponseDto extends createZodDto(
  z.strictObject({
    items: z
      .array(
        z.strictObject({
          id,
          actorId: id,
          productId: id.nullable(),
          categoryId: id.nullable(),
          action: text,
          reason: text,
          requestId: id,
          createdAt: date,
        }),
      )
      .max(50),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
) {}
