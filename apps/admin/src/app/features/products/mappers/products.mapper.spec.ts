import { convertToParamMap } from '@angular/router';
import {
  mapAudit,
  mapDetail,
  mapPage,
  parseFilters,
  variantProfileSchema,
} from './products.mapper';
import { detail, context, id } from '../testing/product.fixture';
describe('Company product contracts', () => {
  it('strips unexpected response data', () => {
    expect(
      mapDetail(
        {
          ...detail,
          secret: 'private',
          product: { ...detail.product, secret: 'private' },
        },
        context,
      ),
    ).toEqual(detail);
  });
  it('rejects another company', () =>
    expect(() =>
      mapDetail(detail, { ...context, organizationId: id(9) }),
    ).toThrow());
  it('rejects foreign variants', () =>
    expect(() =>
      mapDetail(
        { ...detail, variants: [{ ...detail.variants[0], productId: id(9) }] },
        context,
      ),
    ).toThrow());
  it('rejects repeated variants', () =>
    expect(() =>
      mapDetail(
        { ...detail, variants: [...detail.variants, ...detail.variants] },
        context,
      ),
    ).toThrow());
  it('rejects foreign photos', () =>
    expect(() =>
      mapDetail(
        {
          ...detail,
          photos: [
            {
              id: id(8),
              mediaId: id(9),
              productId: id(7),
              position: 0,
              createdAt: detail.product.createdAt,
            },
          ],
        },
        context,
      ),
    ).toThrow());
  it('preserves historical currency for read-only display', () =>
    expect(
      mapDetail(
        { ...detail, product: { ...detail.product, currency: 'USD' } },
        context,
      ).product.currency,
    ).toBe('USD'));
  it('rejects mismatched list status', () =>
    expect(() =>
      mapPage(
        { items: [detail], total: 1, page: 1, limit: 20 },
        { organizationId: id(2), page: 1, limit: 20, status: 'published' },
      ),
    ).toThrow());
  it('rejects invalid pagination', () =>
    expect(
      parseFilters(convertToParamMap({ organizationId: id(2), page: '0' })),
    ).toBeNull());
  it('rejects invalid attribute keys and prices', () => {
    expect(
      variantProfileSchema.safeParse({
        sku: 'ABC',
        priceMinor: 1.5,
        attributes: {},
      }).success,
    ).toBe(false);
    expect(
      variantProfileSchema.safeParse({
        sku: 'ABC',
        priceMinor: 1,
        attributes: { 'Bad Key': 'M' },
      }).success,
    ).toBe(false);
  });
  it.each([
    'product.submit',
    'product.review',
    'product.pause',
    'product.archive',
  ])('accepts existing API lifecycle event %s', (action) => {
    const dto = {
      items: [
        {
          id: id(8),
          actorId: id(4),
          productId: id(1),
          categoryId: null,
          action,
          reason: 'Verified product maintenance',
          requestId: id(9),
          createdAt: detail.product.createdAt,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
    expect(mapAudit(dto, context, 1).items[0]?.action).toBe(action);
  });
});
