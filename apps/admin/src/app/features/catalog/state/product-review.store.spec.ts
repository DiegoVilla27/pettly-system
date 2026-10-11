import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { CATALOG_GATEWAY } from '../models/catalog-gateway';
import { ProductReviewStore } from './product-review.store';
import { mapDetail, mapProduct } from '../mappers/catalog.mapper';
import type { Product, ProductDto } from '../models/catalog';
import { ApiProblem } from '../../../core/api';
const id = '123e4567-e89b-42d3-a456-426614174000';
const other = '123e4567-e89b-42d3-a456-426614174001';
const product: ProductDto = {
  id,
  organizationId: other,
  categoryId: other,
  name: 'Balanced dog food',
  description: 'Complete food for adult dogs.',
  brand: null,
  currency: 'COP',
  version: 4,
  status: 'pending',
  createdBy: other,
  reviewedBy: null,
  reviewedAt: null,
  reviewReason: null,
  createdAt: '2026-10-08T12:00:00Z',
  updatedAt: '2026-10-08T12:00:00Z',
};
const detail = (target = id) =>
  mapDetail(
    {
      product: { ...product, id: target },
      variants: [],
      photos: [
        {
          id: other,
          productId: target,
          mediaId: other,
          position: 0,
          createdAt: product.createdAt,
        },
      ],
    },
    target,
  );
describe('Product moderation state', () => {
  it('excludes duplicate decisions and preserves the viewed version after a conflict', () => {
    const pending = new Subject<Product>();
    const review = vi.fn(() => pending);
    const preview = vi.fn(() => of(detail()));
    TestBed.configureTestingModule({
      providers: [
        ProductReviewStore,
        { provide: CATALOG_GATEWAY, useValue: { review, preview } },
      ],
    });
    const store = TestBed.inject(ProductReviewStore);
    store.load(id);
    const command = {
      id,
      body: {
        approved: true,
        reason: 'Independent review confirmation',
        expectedVersion: 4,
      },
    };
    store.review(command);
    store.review(command);
    expect(review).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(409, 'CONFLICT', 'Private internal details'));
    expect(store.detail()?.product.version).toBe(4);
    expect(store.problem()?.message).toContain('Actualiza los datos');
    expect(preview).toHaveBeenCalledTimes(1);
    expect(store.busy()).toBe(false);
  });
  it('never restores closed photos or applies a late decision to another product', () => {
    const image = new Subject<Blob>();
    const mutation = new Subject<Product>();
    TestBed.configureTestingModule({
      providers: [
        ProductReviewStore,
        {
          provide: CATALOG_GATEWAY,
          useValue: {
            preview: (target: string) => of(detail(target)),
            photo: () => image,
            review: () => mutation,
          },
        },
      ],
    });
    const store = TestBed.inject(ProductReviewStore);
    store.load(id);
    store.openPhoto(other);
    store.closePhoto();
    image.next(new Blob(['private'], { type: 'image/jpeg' }));
    expect(store.photo()).toBeNull();
    store.review({
      id,
      body: {
        approved: true,
        reason: 'Independent review confirmation',
        expectedVersion: 4,
      },
    });
    store.load(other);
    mutation.next(mapProduct({ ...product, status: 'published', version: 5 }));
    mutation.complete();
    expect(store.detail()?.product.id).toBe(other);
    expect(store.decision()).toBeNull();
  });
});
