import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import {
  CATALOG_ACCESS,
  type CatalogAccess,
} from '../catalog/application/ports/in/catalog-access';
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
  INVENTORY_REPOSITORY,
  type InventoryRepository,
} from './application/ports/out/inventory-repository';
import { INVENTORY_USE_CASES } from './application/ports/in/inventory-use-cases';
import { InventoryHandlers } from './application/handlers/inventory.handlers';
import { PrismaInventoryRepository } from './adapters/out/persistence/prisma-inventory-repository';
import {
  InventoryController,
  PublicInventoryController,
} from './adapters/in/http/controllers/inventory.controller';
import { ORDER_STOCK } from './application/ports/in/order-stock';
import { HoldExpiration } from './adapters/in/scheduling/hold-expiration';
@Module({
  imports: [CatalogModule, AuthorizationModule],
  controllers: [PublicInventoryController, InventoryController],
  providers: [
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
    {
      provide: INVENTORY_USE_CASES,
      useFactory: (
        repo: InventoryRepository,
        catalog: CatalogAccess,
        auth: Authorization,
        clock: Clock,
        entropy: Entropy,
      ) => new InventoryHandlers(repo, catalog, auth, clock, entropy),
      inject: [
        INVENTORY_REPOSITORY,
        CATALOG_ACCESS,
        AUTHORIZATION,
        CLOCK,
        ENTROPY,
      ],
    },
    { provide: ORDER_STOCK, useExisting: INVENTORY_USE_CASES },
    HoldExpiration,
  ],
  exports: [INVENTORY_USE_CASES, ORDER_STOCK],
})
export class InventoryModule {}
