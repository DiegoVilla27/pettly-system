import type { ApiRequest, ApiResponse, ApiQuery } from '@pettly/api-client';
export type CategoryDto = ApiResponse<'createProductCategory'>;
export type Category = CategoryDto & { statusLabel: string };
export type ProductDto = ApiResponse<'reviewCatalogProduct'>;
export type Product = ProductDto & { statusLabel: string };
export type ProductDetail = Omit<
  ApiResponse<'getProductReviewPreview'>,
  'product'
> & { product: Product };
export type Audit = ApiResponse<'listCategoryAudit'>['items'][number] & {
  actionLabel: string;
};
export type CategoryCreate = ApiRequest<'createProductCategory'>;
export type CategoryUpdate = ApiRequest<'updateProductCategory'>;
export type ProductReview = ApiRequest<'reviewCatalogProduct'>;
export type QueueFilters = ApiQuery<'listProductModerationQueue'>;
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export type CategoryCommand =
  | { kind: 'create'; body: CategoryCreate }
  | { kind: 'update'; id: string; body: CategoryUpdate };
export interface PhotoPreview {
  productId: string;
  mediaId: string;
  blob: Blob;
}
export const categoryStatuses = [
  { value: 'active', label: 'Activa' },
  { value: 'inactive', label: 'Inactiva' },
  { value: 'archived', label: 'Archivada' },
] as const;
