import { ApplicationError } from '../../../../shared/domain/application-error';
export const PRODUCT_STATUSES = [
  'draft',
  'pending',
  'published',
  'rejected',
  'paused',
  'archived',
] as const;
export const CURRENCIES = ['COP', 'USD', 'EUR'] as const;
export interface ProductProfile {
  name: string;
  description: string;
  brand: string | null;
  categoryId: string;
}
export function text(value: unknown, min: number, max: number): string {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max ||
    /\p{Cc}/u.test(value)
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'Invalid text length or control characters.',
    );
  return value.trim();
}
export function profile(value: ProductProfile): ProductProfile {
  return {
    name: text(value.name, 2, 150),
    description: text(value.description, 10, 4000),
    brand: value.brand === null ? null : text(value.brand, 1, 100),
    categoryId: text(value.categoryId, 36, 36),
  };
}
export interface VariantProfile {
  sku: string;
  priceMinor: number;
  attributes: Record<string, string>;
}
export function variant(value: VariantProfile): VariantProfile {
  const sku = text(value.sku, 1, 64).toUpperCase();
  if (
    !/^[A-Z0-9][A-Z0-9._-]*$/.test(sku) ||
    !Number.isInteger(value.priceMinor) ||
    value.priceMinor < 1 ||
    value.priceMinor > 2147483647
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'SKU or minor-unit price is invalid.',
    );
  if (
    !value.attributes ||
    typeof value.attributes !== 'object' ||
    Array.isArray(value.attributes) ||
    Object.keys(value.attributes).length > 10
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'At most ten variant attributes are allowed.',
    );
  const attrs: Record<string, string> = {};
  for (const key of Object.keys(value.attributes).sort()) {
    if (!/^[a-z][a-z0-9_]{0,29}$/.test(key))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Attribute keys must be lowercase identifiers.',
      );
    attrs[key] = text(value.attributes[key], 1, 80);
  }
  return { sku, priceMinor: value.priceMinor, attributes: attrs };
}
