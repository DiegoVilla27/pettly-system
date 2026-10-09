import type { OrganizationAccess } from '../../apps/api/src/modules/organizations/application/ports/in/organization-access';
import { NotificationsHandlers } from '../../apps/api/src/modules/notifications/application/handlers/notifications.handlers';
import { PrismaNotificationsRepository } from '../../apps/api/src/modules/notifications/adapters/out/persistence/prisma-notifications-repository';
import { config } from '../../apps/api/src/shared/infrastructure/config';
import type { UsersDirectory } from '../../apps/api/src/modules/users/application/ports/out/users-directory';
/** Isolated integration helper exercising internal ports; never part of API/worker builds. */
import 'reflect-metadata';
import { randomUUID, createHash } from 'node:crypto';
import { Database } from '../../apps/api/src/shared/infrastructure/database';
import { PrismaInventoryRepository } from '../../apps/api/src/modules/inventory/adapters/out/persistence/prisma-inventory-repository';
import { InventoryHandlers } from '../../apps/api/src/modules/inventory/application/handlers/inventory.handlers';
import { PrismaOrdersRepository } from '../../apps/api/src/modules/orders/adapters/out/persistence/prisma-orders-repository';
import { OrdersHandlers } from '../../apps/api/src/modules/orders/application/handlers/orders.handlers';
import type { Authorization } from '../../apps/api/src/modules/authorization/application/ports/in/authorization';
import type { CatalogAccess } from '../../apps/api/src/modules/catalog/application/ports/in/catalog-access';
import type { CartCheckout } from '../../apps/api/src/modules/cart/application/ports/in/cart-checkout';
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? 'http://invalid');
  if (
    process.env.NODE_ENV !== 'test' ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== '/pettly_test'
  )
    throw new Error('This helper requires the isolated integration database.');
  const [action, orderId, paymentId, amount, currency, time] =
      process.argv.slice(2),
    db = new Database();
  const clock = { now: () => (time ? new Date(time) : new Date()) },
    entropy = {
      id: randomUUID,
      token: randomUUID,
      digest: (s: string) => createHash('sha256').update(s).digest('hex'),
    };
  const unused = () => {
    throw new Error('Unexpected integration port invocation.');
  };
  const auth = { requirePermission: unused } as unknown as Authorization;
  const cart = { read: unused, consume: unused } as unknown as CartCheckout;
  const catalog: CatalogAccess = {
    saleVariants: unused,
    variants: async (ids) => {
      const rows = await db.client.catalogVariant.findMany({
        where: { id: { in: ids } },
        include: {
          product: { include: { category: true, organization: true } },
        },
      });
      return rows.map((v) => ({
        id: v.id,
        productId: v.productId,
        organizationId: v.organizationId,
        active: v.status === 'active' && v.product.status !== 'archived',
        published:
          v.status === 'active' &&
          v.product.status === 'published' &&
          v.product.category.status === 'active' &&
          v.product.organization.status === 'active',
      }));
    },
  };
  const inventory = new InventoryHandlers(
    new PrismaInventoryRepository(db),
    catalog,
    auth,
    clock,
    entropy,
  );
  const notices = new NotificationsHandlers(
    new PrismaNotificationsRepository(db, config().mailKey),
    {
      findById: (id: string) => db.client.user.findUnique({ where: { id } }),
    } as unknown as UsersDirectory,
    clock,
    entropy,
  );
  const organizations = {
    findOrganization: (id: string) =>
      db.client.organization.findUnique({ where: { id } }),
  } as unknown as OrganizationAccess;
  const orders = new OrdersHandlers(
    new PrismaOrdersRepository(db),
    cart,
    catalog,
    inventory,
    inventory,
    auth,
    clock,
    entropy,
    undefined,
    notices,
    organizations,
  );
  try {
    if (action === 'expire') {
      await orders.expireDue();
      process.stdout.write('expired');
    } else if (action === 'settle') {
      const result = await orders.settleVerified(
        orderId,
        paymentId,
        Number(amount),
        currency,
        randomUUID(),
      );
      process.stdout.write(result.status);
    } else throw new Error('Invalid helper operation.');
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch(() => {
  process.stderr.write('Isolated order system-port operation failed.\n');
  process.exitCode = 1;
});
