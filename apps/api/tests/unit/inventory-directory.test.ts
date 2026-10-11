import test from 'node:test';
import assert from 'node:assert/strict';
import { InventoryHandlers } from '../../src/modules/inventory/application/handlers/inventory.handlers';
import { InventoryListQuery } from '../../src/modules/inventory/application/queries/inventory.queries';
import type { InventoryWork } from '../../src/modules/inventory/application/ports/out/inventory-repository';
import type { Authorization } from '../../src/modules/authorization/application/ports/in/authorization';
import type { CatalogAccess } from '../../src/modules/catalog/application/ports/in/catalog-access';
import type { InventoryCatalog } from '../../src/modules/catalog/application/ports/in/inventory-catalog';
import type {
  HoldState,
  Movement,
  StockState,
} from '../../src/modules/inventory/application/results/inventory';
import { Stock } from '../../src/modules/inventory/domain/aggregates/stock';
const now = new Date('2026-10-10T00:00:00Z');
const unused = async (): Promise<never> => {
  throw Error('Unexpected per-row adapter call');
};
test('inventory directory reads in batches, expires due holds once and retains virtual zero/history', async () => {
  const stock = Stock.empty('variant-b', now);
  stock.change(10, 0, now);
  stock.change(0, 3, now);
  const hold: HoldState = {
    id: 'hold',
    variantId: 'variant-b',
    organizationId: 'company',
    referenceId: 'reference',
    orderId: null,
    quantity: 3,
    status: 'active',
    expiresAt: new Date(now.getTime() - 1),
    createdAt: new Date(now.getTime() - 1000),
    updatedAt: new Date(now.getTime() - 1000),
  };
  const writes: StockState[] = [];
  const events: Movement[] = [];
  const locks: string[] = [];
  let batchReads = 0;
  let holdReads = 0;
  const tx: InventoryWork = {
    lock: async (key) => {
      locks.push(key);
    },
    stocks: async (ids) => {
      batchReads++;
      assert.deepEqual(ids, ['variant-a', 'variant-b']);
      return [stock.snapshot()];
    },
    dueHolds: async (ids, cutoff) => {
      holdReads++;
      assert.deepEqual(ids, ['variant-a', 'variant-b']);
      assert.equal(cutoff, now);
      return [hold];
    },
    saveStock: async (state) => {
      writes.push(state);
    },
    expireHolds: async (ids) => {
      assert.deepEqual(ids, ['hold']);
    },
    addMovements: async (items) => {
      events.push(...items);
    },
    stock: unused,
    availability: unused,
    hold: unused,
    holds: unused,
    saveHold: unused,
    expiredVariants: unused,
    movement: unused,
    addMovement: unused,
    movements: unused,
  };
  const auth: Authorization = {
    roles: () => [],
    getAccess: unused,
    getUserAccess: unused,
    requirePermission: async (actor, permission, scope) => {
      assert.equal(actor, 'operator');
      assert.equal(permission, 'inventory.manage');
      assert.equal(scope, 'company');
    },
  };
  const catalog: CatalogAccess = { variants: unused, saleVariants: unused };
  const directory: InventoryCatalog = {
    inventoryVariants: async (query) => {
      assert.equal(query.organizationId, 'company');
      return {
        items: [
          {
            id: 'variant-b',
            organizationId: 'company',
            productId: 'product-b',
            productName: 'Old product',
            productStatus: 'archived',
            variantStatus: 'archived',
            sku: 'SKU-B',
          },
          {
            id: 'variant-a',
            organizationId: 'company',
            productId: 'product-a',
            productName: 'New product',
            productStatus: 'draft',
            variantStatus: 'active',
            sku: 'SKU-A',
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };
    },
  };
  const handler = new InventoryHandlers(
    { run: async (callback) => callback(tx) },
    catalog,
    auth,
    { now: () => now },
    { id: () => 'event', token: () => 'token', digest: (value) => value },
    directory,
  );
  const result = await handler.list(
    new InventoryListQuery('operator', 'company'),
  );
  assert.equal(batchReads, 1);
  assert.equal(holdReads, 1);
  assert.equal(result.items[0]?.stock.reserved, 0);
  assert.equal(result.items[0]?.stock.version, 4);
  assert.equal(result.items[1]?.stock.version, 1);
  assert.equal(result.items[1]?.stock.onHand, 0);
  assert.equal(writes.length, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.kind, 'expire');
  assert.equal(events[0]?.actorId, null);
  assert.deepEqual(locks, [
    'user:operator',
    'organization:company',
    'product:product-a',
    'product:product-b',
    'catalog:categories',
    'stock:variant-a',
    'stock:variant-b',
  ]);
});
test('inventory directory enforces bounded query pagination, search and status', () => {
  for (const page of [0, 10001, 1.5])
    assert.throws(() => new InventoryListQuery('actor', 'company', page));
  assert.throws(() => new InventoryListQuery('actor', 'company', 1, 51));
  assert.throws(
    () => new InventoryListQuery('actor', 'company', 1, 20, 'bad\nquery'),
  );
});
