export type {
  ProductState,
  VariantState,
} from '../../domain/aggregates/product';
export type { CategoryState } from '../../domain/aggregates/category';
export interface ProductPhoto {
  id: string;
  productId: string;
  mediaId: string;
  position: number;
  createdAt: Date;
}
export interface CatalogAudit {
  id: string;
  actorId: string;
  productId: string | null;
  categoryId: string | null;
  action: string;
  reason: string;
  requestId: string;
  createdAt: Date;
}
export interface VariantIdentity {
  id: string;
  productId: string;
  organizationId: string;
  active: boolean;
  published: boolean;
}

export interface SaleVariant {
  id: string;
  productId: string;
  organizationId: string;
  currency: string;
  name: string;
  sku: string;
  priceMinor: number;
  attributes: Record<string, string>;
  productVersion: number;
}
