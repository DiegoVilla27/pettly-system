import { CatalogQuery } from '../../src/modules/catalog/application/queries/catalog.queries';
import { StockQuery } from '../../src/modules/inventory/application/queries/inventory.queries';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Product,
  ProductVariant,
} from '../../src/modules/catalog/domain/aggregates/product';
import { Category } from '../../src/modules/catalog/domain/aggregates/category';
import {
  Stock,
  Hold,
} from '../../src/modules/inventory/domain/aggregates/stock';
import {
  CreateProductDto,
  CreateVariantDto,
  PublicCatalogQueryDto,
} from '../../src/modules/catalog/adapters/in/http/dtos/requests/catalog.requests';
import { StockMovementDto } from '../../src/modules/inventory/adapters/in/http/dtos/requests/inventory.requests';
const now = new Date('2026-10-08T12:00:00Z'),
  id = '123e4567-e89b-42d3-a456-426614174000';
const profile = {
  name: 'Balanced dog food',
  description: 'A complete food for adult dogs.',
  brand: null,
  categoryId: id,
};
test('money, normalized SKUs and bounded variant attributes are protected in the domain', () => {
  const p = Product.create(id, id, id, profile, 'COP', now).snapshot();
  const v = ProductVariant.create(
    id,
    p,
    { sku: ' food-small ', priceMinor: 1000, attributes: { size: 'small' } },
    now,
  );
  assert.equal(v.sku, 'FOOD-SMALL');
  for (const priceMinor of [0, -1, 1.5, 2147483648])
    assert.throws(() =>
      ProductVariant.create(
        id,
        p,
        { sku: 'SKU', priceMinor, attributes: {} },
        now,
      ),
    );
  assert.throws(() =>
    ProductVariant.create(
      id,
      p,
      { sku: 'SKU', priceMinor: 100, attributes: { 'bad key': 'value' } },
      now,
    ),
  );
});
test('product moderation separates publication, changes and terminal archival', () => {
  const p = Product.create(id, id, 'creator', profile, 'COP', now);
  assert.throws(() => p.submit(false, now));
  p.submit(true, now);
  assert.throws(() => p.update({ name: 'Changed name' }, now));
  assert.throws(() =>
    p.review('creator', true, 'Reviewed supplier listing.', now),
  );
  p.review('moderator', true, 'Reviewed supplier listing.', now);
  p.update({ name: 'Revised listing' }, now);
  assert.equal(p.snapshot().status, 'draft');
  assert.equal(p.snapshot().reviewedBy, null);
  p.status('archived', now);
  assert.throws(() => p.submit(true, now));
  assert.throws(() => p.update({ name: 'Reactivated item' }, now));
});
test('category slugs and terminal states are domain invariants', () => {
  assert.throws(() => Category.create(id, 'Food', 'Bad Slug', null, now));
  const c = Category.create(id, 'Food', 'food', null, now);
  assert.throws(() => Category.update(c, { status: 'inactive' }, 2, now));
  const archived = Category.update(c, { status: 'archived' }, 1, now);
  assert.throws(() => Category.update(archived, { status: 'active' }, 2, now));
});
test('physical, reserved and available stock cannot diverge or become negative', () => {
  const s = Stock.empty(id, now);
  s.change(10, 0, now);
  s.change(0, 7, now);
  assert.throws(() => s.change(-4, 0, now));
  assert.throws(() => s.change(0, 4, now));
  assert.throws(() => s.expect(1));
  s.change(-7, -7, now);
  assert.deepEqual([s.snapshot().onHand, s.snapshot().reserved], [3, 0]);
  assert.throws(() => s.change(0, -1, now));
  assert.throws(() => s.change(0.5, 0, now));
});
test('reservation deadlines and terminal decisions prevent late or repeated consumption', () => {
  assert.throws(() => Hold.create(id, id, id, id, 1, now, now));
  assert.throws(() =>
    Hold.create(id, id, id, id, 1, new Date(now.getTime() + 1800001), now),
  );
  const h = Hold.create(id, id, id, id, 2, new Date(now.getTime() + 1000), now);
  assert.throws(() =>
    Hold.close(h, 'consumed', new Date(now.getTime() + 1000)),
  );
  const released = Hold.close(h, 'released', now);
  assert.throws(() => Hold.close(released, 'consumed', now));
});
test('strict transport contracts reject lifecycle injection and ambiguous prices or inventory deltas', () => {
  assert.equal(
    CreateProductDto.schema.safeParse({
      organizationId: id,
      profile,
      currency: 'COP',
      reason: 'Supplier catalog registered.',
      status: 'published',
    }).success,
    false,
  );
  assert.equal(
    CreateVariantDto.schema.safeParse({
      profile: { sku: 'SKU', priceMinor: 1.5 },
      reason: 'Variant registered correctly.',
      expectedVersion: 1,
    }).success,
    false,
  );
  assert.equal(
    PublicCatalogQueryDto.schema.safeParse({ minPriceMinor: 100 }).success,
    false,
  );
  assert.equal(
    PublicCatalogQueryDto.schema.safeParse({
      minPriceMinor: 200,
      maxPriceMinor: 100,
      currency: 'COP',
    }).success,
    false,
  );
  assert.equal(
    StockMovementDto.schema.safeParse({
      kind: 'issue',
      quantity: -1,
      expectedVersion: 1,
      idempotencyKey: id,
      reason: 'Physical stock was checked.',
    }).success,
    false,
  );
});

test('application queries also reject unsafe pagination and ambiguous currency filters without HTTP', () => {
  assert.throws(() => new CatalogQuery(0, 20));
  assert.throws(() => new CatalogQuery(1, 51));
  assert.throws(
    () =>
      new CatalogQuery(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        100,
      ),
  );
  assert.throws(() => new StockQuery(id, id, 1, 101));
});
