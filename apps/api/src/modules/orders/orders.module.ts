import { OrganizationsModule } from '../organizations/organizations.module';
import {
  ORGANIZATION_ACCESS,
  type OrganizationAccess,
} from '../organizations/application/ports/in/organization-access';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  BUSINESS_NOTIFICATIONS,
  type BusinessNotifications,
} from '../notifications/application/ports/in/business-notifications';
import { Module } from '@nestjs/common';
import { PaymentPolicyModule } from '../payments/payment-policy.module';
import {
  COMMISSION_POLICY,
  type CommissionPolicy,
} from '../payments/application/ports/in/commission-policy';
import { CartModule } from '../cart/cart.module';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import {
  CART_CHECKOUT,
  type CartCheckout,
} from '../cart/application/ports/in/cart-checkout';
import {
  CATALOG_ACCESS,
  type CatalogAccess,
} from '../catalog/application/ports/in/catalog-access';
import {
  ORDER_STOCK,
  type OrderStock,
} from '../inventory/application/ports/in/order-stock';
import {
  INVENTORY_USE_CASES,
  type InventoryUseCases,
} from '../inventory/application/ports/in/inventory-use-cases';
import {
  AUTHORIZATION,
  type Authorization,
} from '../authorization/application/ports/in/authorization';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import {
  ORDERS_REPOSITORY,
  type OrdersRepository,
} from './application/ports/out/orders-repository';
import { ORDERS_USE_CASES } from './application/ports/in/orders-use-cases';
import { ORDER_PAYMENTS } from './application/ports/in/order-payments';
import { OrdersHandlers } from './application/handlers/orders.handlers';
import { PrismaOrdersRepository } from './adapters/out/persistence/prisma-orders-repository';
import { OrdersController } from './adapters/in/http/controllers/orders.controller';
import { OrderExpiration } from './adapters/in/scheduling/order-expiration';
@Module({
  imports: [
    NotificationsModule,
    OrganizationsModule,
    CartModule,
    CatalogModule,
    InventoryModule,
    AuthorizationModule,
    PaymentPolicyModule,
  ],
  controllers: [OrdersController],
  providers: [
    { provide: ORDERS_REPOSITORY, useClass: PrismaOrdersRepository },
    {
      provide: ORDERS_USE_CASES,
      useFactory: (
        r: OrdersRepository,
        c: CartCheckout,
        k: CatalogAccess,
        s: OrderStock,
        i: InventoryUseCases,
        a: Authorization,
        clock: Clock,
        e: Entropy,
        p: CommissionPolicy,
        notices: BusinessNotifications,
        orgs: OrganizationAccess,
      ) => new OrdersHandlers(r, c, k, s, i, a, clock, e, p, notices, orgs),
      inject: [
        ORDERS_REPOSITORY,
        CART_CHECKOUT,
        CATALOG_ACCESS,
        ORDER_STOCK,
        INVENTORY_USE_CASES,
        AUTHORIZATION,
        CLOCK,
        ENTROPY,
        COMMISSION_POLICY,
        BUSINESS_NOTIFICATIONS,
        ORGANIZATION_ACCESS,
      ],
    },
    { provide: ORDER_PAYMENTS, useExisting: ORDERS_USE_CASES },
    OrderExpiration,
  ],
  exports: [ORDER_PAYMENTS],
})
export class OrdersModule {}
