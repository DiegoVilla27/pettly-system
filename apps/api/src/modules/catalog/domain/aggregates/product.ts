import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  profile,
  variant,
  CURRENCIES,
  type ProductProfile,
  type VariantProfile,
  type PRODUCT_STATUSES,
} from '../value-objects/product-details';
export interface ProductState extends ProductProfile {
  id: string;
  organizationId: string;
  currency: (typeof CURRENCIES)[number];
  status: (typeof PRODUCT_STATUSES)[number];
  version: number;
  createdBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface VariantState extends VariantProfile {
  id: string;
  productId: string;
  organizationId: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
export class Product {
  private constructor(private state: ProductState) {}
  static create(
    id: string,
    org: string,
    actor: string,
    details: ProductProfile,
    currency: ProductState['currency'],
    now: Date,
  ) {
    if (!CURRENCIES.includes(currency))
      throw new ApplicationError('INVALID_INPUT', 'Unsupported currency.');
    return new Product({
      ...profile(details),
      id,
      organizationId: org,
      currency,
      status: 'draft',
      version: 1,
      createdBy: actor,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  static restore(state: ProductState) {
    return new Product({ ...state });
  }
  snapshot() {
    return { ...this.state };
  }
  expect(version: number) {
    if (version !== this.state.version)
      throw new ApplicationError(
        'CONFLICT',
        'The product changed. Read its current version.',
      );
  }
  mutable() {
    if (this.state.status === 'archived' || this.state.status === 'pending')
      throw new ApplicationError(
        'CONFLICT',
        'Archived or pending products cannot be edited.',
      );
  }
  changed(now: Date) {
    this.mutable();
    this.state.status = 'draft';
    this.state.reviewedBy = null;
    this.state.reviewedAt = null;
    this.state.reviewReason = null;
    this.touch(now);
  }
  update(value: Partial<ProductProfile>, now: Date) {
    this.mutable();
    const details = profile({ ...this.state, ...value });
    if (
      Object.entries(details).every(
        ([k, v]) => this.state[k as keyof ProductState] === v,
      )
    )
      return false;
    Object.assign(this.state, details);
    this.changed(now);
    return true;
  }
  submit(ready: boolean, now: Date) {
    if (!['draft', 'rejected', 'paused'].includes(this.state.status) || !ready)
      throw new ApplicationError(
        'CONFLICT',
        'A draft with active category, photo and variant is required.',
      );
    this.state.status = 'pending';
    this.touch(now);
  }
  review(actor: string, approved: boolean, reason: string, now: Date) {
    if (this.state.status !== 'pending')
      throw new ApplicationError(
        'CONFLICT',
        'Only pending products can be reviewed.',
      );
    if (actor === this.state.createdBy)
      throw new ApplicationError('FORBIDDEN', 'Self-review is forbidden.');
    this.state.status = approved ? 'published' : 'rejected';
    this.state.reviewedBy = actor;
    this.state.reviewedAt = now;
    this.state.reviewReason = reason;
    this.touch(now);
  }
  status(status: 'paused' | 'archived', now: Date) {
    if (this.state.status === 'archived')
      throw new ApplicationError('CONFLICT', 'Archived products are terminal.');
    if (status === 'paused' && this.state.status !== 'published')
      throw new ApplicationError(
        'CONFLICT',
        'Only published products can be paused.',
      );
    this.state.status = status;
    this.touch(now);
  }
  private touch(now: Date) {
    this.state.version++;
    this.state.updatedAt = now;
  }
}
export class ProductVariant {
  static create(
    id: string,
    product: ProductState,
    details: VariantProfile,
    now: Date,
  ): VariantState {
    return {
      ...variant(details),
      id,
      productId: product.id,
      organizationId: product.organizationId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
  }
  static update(
    state: VariantState,
    details: Partial<VariantProfile>,
    now: Date,
  ): VariantState {
    if (state.status !== 'active')
      throw new ApplicationError('CONFLICT', 'Archived variants are terminal.');
    return { ...state, ...variant({ ...state, ...details }), updatedAt: now };
  }
}
