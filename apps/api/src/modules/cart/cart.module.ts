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
  CART_REPOSITORY,
  type CartRepository,
} from './application/ports/out/cart-repository';
import { CART_USE_CASES } from './application/ports/in/cart-use-cases';
import { CART_CHECKOUT } from './application/ports/in/cart-checkout';
import { CartHandlers } from './application/handlers/cart.handlers';
import { PrismaCartRepository } from './adapters/out/persistence/prisma-cart-repository';
import { CartController } from './adapters/in/http/controllers/cart.controller';
@Module({
  imports: [CatalogModule, AuthorizationModule],
  controllers: [CartController],
  providers: [
    { provide: CART_REPOSITORY, useClass: PrismaCartRepository },
    {
      provide: CART_USE_CASES,
      useFactory: (
        r: CartRepository,
        c: CatalogAccess,
        a: Authorization,
        k: Clock,
        e: Entropy,
      ) => new CartHandlers(r, c, a, k, e),
      inject: [CART_REPOSITORY, CATALOG_ACCESS, AUTHORIZATION, CLOCK, ENTROPY],
    },
    { provide: CART_CHECKOUT, useExisting: CART_USE_CASES },
  ],
  exports: [CART_CHECKOUT],
})
export class CartModule {}
