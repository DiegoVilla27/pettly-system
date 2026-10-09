import type {
  ProductState,
  VariantState,
  CategoryState,
  ProductPhoto,
} from '../../../../application/results/catalog';
export class CatalogHttpMapper {
  static category(c: CategoryState) {
    return {
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
  static publicProduct(p: ProductState) {
    return {
      id: p.id,
      organizationId: p.organizationId,
      categoryId: p.categoryId,
      name: p.name,
      description: p.description,
      brand: p.brand,
      currency: p.currency,
      version: p.version,
    };
  }
  static product(p: ProductState) {
    return {
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      reviewedAt: p.reviewedAt?.toISOString() ?? null,
    };
  }
  static variant(v: VariantState) {
    return {
      ...v,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }
  static photo(p: ProductPhoto) {
    return { ...p, createdAt: p.createdAt.toISOString() };
  }
  static detail(
    d: {
      product: ProductState;
      variants: VariantState[];
      photos: ProductPhoto[];
    },
    privateRead = false,
  ) {
    return {
      product: privateRead
        ? CatalogHttpMapper.product(d.product)
        : CatalogHttpMapper.publicProduct(d.product),
      variants: d.variants.map(CatalogHttpMapper.variant),
      photos: d.photos.map(CatalogHttpMapper.photo),
    };
  }
}
