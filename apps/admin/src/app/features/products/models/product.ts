import type { ApiRequest, ApiResponse } from '@pettly/api-client';
export type ProductDetail = ApiResponse<'getManagedProduct'>;
export type Product = ProductDetail['product'];
export type Variant = ProductDetail['variants'][number];
export type ProductPage = ApiResponse<'listManagedProducts'>;
export type ProductAudit = ApiResponse<'listProductAudit'>;
export type Category = ApiResponse<'listPublicCategories'>['items'][number];
export type Profile = Required<ApiRequest<'createCatalogProduct'>['profile']>;
export type VariantProfile = Required<
  ApiRequest<'createProductVariant'>['profile']
>;
export type Company = { id: string; name: string };
export type Context = { organizationId: string; productId: string };
export type Filters = {
  organizationId: string;
  page: number;
  limit: number;
  search?: string;
  status?: Product['status'];
  categoryId?: string;
};
export type Decision = ApiRequest<'submitCatalogProduct'>;
export type Command = { context: Context } & (
  | { action: 'update'; body: ApiRequest<'updateCatalogProduct'> }
  | { action: 'variant-create'; body: ApiRequest<'createProductVariant'> }
  | {
      action: 'variant-update';
      variantId: string;
      body: ApiRequest<'updateProductVariant'>;
    }
  | { action: 'variant-archive'; variantId: string; body: Decision }
  | { action: 'upload'; body: Decision & { file: File } }
  | { action: 'remove'; mediaId: string; body: Decision }
  | { action: 'submit' | 'pause' | 'archive'; body: Decision }
);
export const statuses = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'En revisión' },
  { value: 'published', label: 'Publicado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'paused', label: 'Pausado' },
  { value: 'archived', label: 'Archivado' },
] as const;
export const statusLabel = (s: Product['status']) =>
  statuses.find((x) => x.value === s)?.label ?? s;
export const editable = (p: Product) =>
  p.currency === 'COP' && !['pending', 'archived'].includes(p.status);
export const auditLabels: Record<
  ProductAudit['items'][number]['action'],
  string
> = {
  'category.created': 'Categoría creada',
  'category.updated': 'Categoría actualizada',
  'product.created': 'Producto creado',
  'product.submit': 'Enviado a revisión',
  'product.review': 'Revisión registrada',
  'product.pause': 'Producto pausado',
  'product.archive': 'Producto archivado',
  'product.updated': 'Ficha actualizada',
  'product.submitted': 'Enviado a revisión',
  'product.approved': 'Producto aprobado',
  'product.rejected': 'Producto rechazado',
  'product.paused': 'Producto pausado',
  'product.archived': 'Producto archivado',
  'variant.created': 'Variante creada',
  'variant.updated': 'Variante actualizada',
  'variant.archived': 'Variante archivada',
  'photo.created': 'Fotografía añadida',
  'photo.removed': 'Fotografía eliminada',
};
