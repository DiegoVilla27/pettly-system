import type { VariantIdentity, SaleVariant } from '../../results/catalog';
export interface CatalogAccess {
  saleVariants(ids: string[]): Promise<SaleVariant[]>;
  variants(ids: string[]): Promise<VariantIdentity[]>;
}
export const CATALOG_ACCESS = Symbol('CATALOG_ACCESS');
