import type {
  ProductState,
  VariantState,
  CategoryState,
  ProductPhoto,
  CatalogAudit,
} from '../../results/catalog';
import type { CatalogQuery } from '../../queries/catalog.queries';
export interface CatalogWork {
  lock(key: string): Promise<void>;
  category(id: string): Promise<CategoryState | null>;
  categoriesByIds(ids: string[]): Promise<CategoryState[]>;
  categories(includeInactive: boolean): Promise<CategoryState[]>;
  saveCategory(state: CategoryState): Promise<void>;
  productsByIds(ids: string[]): Promise<ProductState[]>;
  product(id: string): Promise<ProductState | null>;
  products(
    query: CatalogQuery,
    publicOnly: boolean,
  ): Promise<{
    items: ProductState[];
    total: number;
    page: number;
    limit: number;
  }>;
  saveProduct(state: ProductState): Promise<void>;
  variants(productIds: string[]): Promise<VariantState[]>;
  variantIds(ids: string[]): Promise<VariantState[]>;
  saveVariant(state: VariantState): Promise<void>;
  photos(productIds: string[]): Promise<ProductPhoto[]>;
  attach(photo: ProductPhoto): Promise<void>;
  detach(id: string): Promise<void>;
  audit(entry: CatalogAudit): Promise<void>;
  audits(
    productId: string | null,
    page: number,
    limit: number,
    categoryId?: string,
  ): Promise<{
    items: CatalogAudit[];
    total: number;
    page: number;
    limit: number;
  }>;
}
export interface CatalogRepository {
  run<T>(work: (tx: CatalogWork) => Promise<T>): Promise<T>;
}
export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
