import type {
  ProductProfile,
  VariantProfile,
} from '../../domain/value-objects/product-details';
export class CategoryCommand {
  constructor(
    readonly actorId: string,
    readonly data: {
      name?: string;
      slug?: string;
      description?: string | null;
      status?: 'active' | 'inactive' | 'archived';
    },
    readonly reason: string,
    readonly requestId: string,
    readonly id?: string,
    readonly expectedVersion?: number,
  ) {}
}
export class CreateProductCommand {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly profile: ProductProfile,
    readonly currency: 'COP' | 'USD' | 'EUR',
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
export class ProductCommand {
  constructor(
    readonly actorId: string,
    readonly productId: string,
    readonly reason: string,
    readonly requestId: string,
    readonly expectedVersion: number,
  ) {}
}
export class UpdateProductCommand extends ProductCommand {
  constructor(
    actorId: string,
    id: string,
    reason: string,
    requestId: string,
    version: number,
    readonly profile: Partial<ProductProfile>,
  ) {
    super(actorId, id, reason, requestId, version);
  }
}
export class VariantCommand extends ProductCommand {
  constructor(
    actorId: string,
    id: string,
    reason: string,
    requestId: string,
    version: number,
    readonly profile: Partial<VariantProfile>,
    readonly variantId?: string,
  ) {
    super(actorId, id, reason, requestId, version);
  }
}
export class PhotoCommand extends ProductCommand {
  constructor(
    actorId: string,
    id: string,
    reason: string,
    requestId: string,
    version: number,
    readonly bytes?: Uint8Array,
    readonly mime?: string,
    readonly mediaId?: string,
  ) {
    super(actorId, id, reason, requestId, version);
  }
}
