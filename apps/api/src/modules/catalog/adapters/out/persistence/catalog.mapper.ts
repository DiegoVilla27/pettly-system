import type {
  CatalogProduct,
  CatalogVariant,
  CatalogCategory,
} from '@prisma/client';
import type {
  ProductState,
  VariantState,
  CategoryState,
} from '../../../application/results/catalog';
export class CatalogPersistenceMapper {
  static product(row: CatalogProduct): ProductState {
    return {
      ...row,
      status: row.status as ProductState['status'],
      currency: row.currency as ProductState['currency'],
    };
  }
  static variant(row: CatalogVariant): VariantState {
    return {
      ...row,
      status: row.status as VariantState['status'],
      attributes: row.attributes as Record<string, string>,
    };
  }
  static category(row: CatalogCategory): CategoryState {
    return { ...row, status: row.status as CategoryState['status'] };
  }
}
