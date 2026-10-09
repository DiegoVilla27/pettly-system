import { OperationsModule } from '../shared/infrastructure/operations/operations';
import { ServicesModule } from '../modules/services/services.module';
import { BookingsModule } from '../modules/bookings/bookings.module';
import { CartModule } from '../modules/cart/cart.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { AnimalsModule } from '../modules/animals/animals.module';
import { AdoptionsModule } from '../modules/adoptions/adoptions.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { InfrastructureModule } from '../shared/infrastructure/infrastructure.module';
import { SecurityGuard } from '../shared/infrastructure/http/security.guard';
import { AuthorizationModule } from '../modules/authorization/authorization.module';
import { OrganizationsModule } from '../modules/organizations/organizations.module';
import { UsersModule } from '../modules/users/users.module';
import { AuthModule } from '../modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
@Module({
  imports: [
    InfrastructureModule,
    OperationsModule,
    ServicesModule,
    BookingsModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    AuthorizationModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    AnimalsModule,
    AdoptionsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    AppService,
    { provide: APP_GUARD, useClass: SecurityGuard },
  ],
})
export class AppModule {}
