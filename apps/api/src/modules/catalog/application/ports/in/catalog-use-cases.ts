import type {
  CategoryCommand,
  CreateProductCommand,
  ProductCommand,
  UpdateProductCommand,
  VariantCommand,
  PhotoCommand,
} from '../../commands/catalog.commands';
import type { CatalogQuery, ProductQuery } from '../../queries/catalog.queries';
import type {
  ProductState,
  VariantState,
  CategoryState,
  ProductPhoto,
  CatalogAudit,
} from '../../results/catalog';
export interface ProductDetail {
  product: ProductState;
  variants: VariantState[];
  photos: ProductPhoto[];
}
export interface CatalogPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface CatalogUseCases {
  categories(actorId?: string): Promise<CategoryState[]>;
  categoryAudit(
    actorId: string,
    id: string,
    page: number,
    limit: number,
  ): Promise<CatalogPage<CatalogAudit>>;
  category(command: CategoryCommand): Promise<CategoryState>;
  create(command: CreateProductCommand): Promise<ProductState>;
  update(command: UpdateProductCommand): Promise<ProductState>;
  decision(
    command: ProductCommand,
    kind: 'submit' | 'pause' | 'archive' | 'review',
    approved?: boolean,
  ): Promise<ProductState>;
  variant(
    command: VariantCommand,
    archive?: boolean,
  ): Promise<{ product: ProductState; variant: VariantState }>;
  upload(
    command: PhotoCommand,
  ): Promise<{ product: ProductState; photo: ProductPhoto }>;
  removePhoto(command: PhotoCommand): Promise<ProductState>;
  get(query: ProductQuery): Promise<ProductDetail>;
  list(
    query: CatalogQuery,
    actorId?: string,
  ): Promise<CatalogPage<ProductDetail>>;
  moderation(
    actorId: string,
    query: CatalogQuery,
  ): Promise<CatalogPage<ProductState>>;
  photo(query: ProductQuery, mediaId: string): Promise<Uint8Array>;
  auditList(
    query: ProductQuery,
    page: number,
    limit: number,
  ): Promise<CatalogPage<CatalogAudit>>;
}
export const CATALOG_USE_CASES = Symbol('CATALOG_USE_CASES');
