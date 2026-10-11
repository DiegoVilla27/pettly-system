import test from 'node:test';
import assert from 'node:assert/strict';
import { CatalogHandlers } from '../../src/modules/catalog/application/handlers/catalog.handlers';
import type { CatalogWork } from '../../src/modules/catalog/application/ports/out/catalog-repository';
import type { Authorization } from '../../src/modules/authorization/application/ports/in/authorization';
import type { OrganizationAccess } from '../../src/modules/organizations/application/ports/in/organization-access';
import type { Media } from '../../src/modules/media/application/ports/in/media';
import { Organization } from '../../src/modules/organizations/domain/aggregates/organization';
import { Product } from '../../src/modules/catalog/domain/aggregates/product';
import { ProductQuery } from '../../src/modules/catalog/application/queries/catalog.queries';
const now = new Date('2026-10-08T12:00:00Z');
const id = '123e4567-e89b-42d3-a456-426614174000';
const unused = async (): Promise<never> => {
  throw Error('Unexpected adapter call');
};
function fixture(creator = 'creator') {
  const product = Product.create(
    id,
    'company',
    creator,
    {
      name: 'Balanced food',
      description: 'Food for adult dogs.',
      brand: null,
      categoryId: id,
    },
    'COP',
    now,
  );
  product.submit(true, now);
  let member = false;
  let active = true;
  const reads: string[] = [];
  const locks: string[] = [];
  const work: CatalogWork = {
    inventoryVariants: unused,
    lock: async (key) => {
      locks.push(key);
    },
    product: async () => product.snapshot(),
    variants: async () => [],
    photos: async () => [
      {
        id: 'attachment',
        productId: id,
        mediaId: 'media',
        position: 0,
        createdAt: now,
      },
    ],
    category: unused,
    categoriesByIds: unused,
    categories: unused,
    saveCategory: unused,
    productsByIds: unused,
    products: unused,
    saveProduct: unused,
    variantIds: unused,
    saveVariant: unused,
    attach: unused,
    detach: unused,
    audit: unused,
    audits: unused,
  };
  const authorization: Authorization = {
    roles: () => [],
    getUserAccess: unused,
    getAccess: unused,
    requirePermission: async (actor, permission, scope) => {
      assert.equal(actor, 'reviewer');
      assert.equal(permission, 'moderation.publications.review');
      assert.equal(scope, undefined);
    },
  };
  const organizations: OrganizationAccess = {
    states: async () => [
      {
        id: 'company',
        status: active ? 'active' : 'suspended',
        type: 'business',
      },
    ],
    findOrganization: unused,
    membershipsForUser: async () =>
      member
        ? [
            {
              id: 'membership',
              organizationId: 'company',
              userId: 'reviewer',
              role: 'business_admin',
              createdAt: now,
              updatedAt: now,
              organization: Organization.create(
                'company',
                'Company',
                'business',
                now,
              ).snapshot(),
            },
          ]
        : [],
  };
  const media: Media = {
    prepare: unused,
    store: unused,
    remove: unused,
    read: async (mediaId, resourceId) => {
      reads.push(mediaId);
      assert.equal(resourceId, id);
      return { bytes: new Uint8Array([1, 2]), width: 1, height: 1 };
    },
  };
  const handler = new CatalogHandlers(
    { run: async (callback) => callback(work) },
    authorization,
    organizations,
    media,
    { now: () => now },
    { id: () => id, token: () => id, digest: (value) => value },
  );
  return {
    handler,
    product,
    reads,
    locks,
    setMember: () => {
      member = true;
    },
    suspend: () => {
      active = false;
    },
  };
}
test('review preview uses moderation permission and binds private media to a locked pending product', async () => {
  const f = fixture();
  assert.equal(
    (await f.handler.reviewPreview(new ProductQuery(id, 'reviewer'))).product
      .status,
    'pending',
  );
  assert.deepEqual(f.locks, [
    'user:reviewer',
    'organization:company',
    'product:' + id,
  ]);
  await assert.rejects(
    f.handler.reviewPhoto(new ProductQuery(id, 'reviewer'), 'foreign'),
    { code: 'RESOURCE_NOT_FOUND' },
  );
  assert.deepEqual(f.reads, []);
  assert.deepEqual(
    await f.handler.reviewPhoto(new ProductQuery(id, 'reviewer'), 'media'),
    new Uint8Array([1, 2]),
  );
});
test('review preview refuses team members, suspended businesses and products that leave the queue', async () => {
  const own = fixture('reviewer');
  await assert.rejects(
    own.handler.reviewPreview(new ProductQuery(id, 'reviewer')),
    { code: 'FORBIDDEN' },
  );
  const member = fixture();
  member.setMember();
  await assert.rejects(
    member.handler.reviewPreview(new ProductQuery(id, 'reviewer')),
    { code: 'FORBIDDEN' },
  );
  const suspended = fixture();
  suspended.suspend();
  await assert.rejects(
    suspended.handler.reviewPhoto(new ProductQuery(id, 'reviewer'), 'media'),
    { code: 'CONFLICT' },
  );
  assert.deepEqual(suspended.reads, []);
  const decided = fixture();
  decided.product.review(
    'reviewer',
    true,
    'Independent review confirmation',
    now,
  );
  await assert.rejects(
    decided.handler.reviewPreview(new ProductQuery(id, 'reviewer')),
    { code: 'CONFLICT' },
  );
  await assert.rejects(decided.handler.reviewPreview(new ProductQuery(id)), {
    code: 'FORBIDDEN',
  });
});
