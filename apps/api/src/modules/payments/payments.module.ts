import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import {
  ORGANIZATION_ACCESS,
  type OrganizationAccess,
} from '../organizations/application/ports/in/organization-access';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PaymentPolicyModule } from './payment-policy.module';
import {
  ORDER_PAYMENTS,
  type OrderPayments,
} from '../orders/application/ports/in/order-payments';
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
  COMMISSION_POLICY,
  type CommissionPolicy,
} from './application/ports/in/commission-policy';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './application/ports/out/payment-provider';
import {
  PAYMENTS_REPOSITORY,
  type PaymentsRepository,
} from './application/ports/out/payments-repository';
import { PAYMENTS_USE_CASES } from './application/ports/in/payments-use-cases';
import { PaymentsHandlers } from './application/handlers/payments.handlers';
import { PrismaPaymentsRepository } from './adapters/out/persistence/prisma-payments-repository';
import { DisabledPaymentProvider } from './adapters/out/provider/disabled-payment-provider';
import { PaymentsController } from './adapters/in/http/controllers/payments.controller';
import { PaymentProcessing } from './adapters/in/scheduling/payment-processing';
@Module({
  imports: [
    OrdersModule,
    OrganizationsModule,
    AuthorizationModule,
    PaymentPolicyModule,
  ],
  controllers: [PaymentsController],
  providers: [
    { provide: PAYMENTS_REPOSITORY, useClass: PrismaPaymentsRepository },
    { provide: PAYMENT_PROVIDER, useClass: DisabledPaymentProvider },
    {
      provide: PAYMENTS_USE_CASES,
      useFactory: (
        r: PaymentsRepository,
        o: OrderPayments,
        a: Authorization,
        p: PaymentProvider,
        c: CommissionPolicy,
        k: Clock,
        e: Entropy,
        org: OrganizationAccess,
      ) => new PaymentsHandlers(r, o, a, p, c, k, e, org),
      inject: [
        PAYMENTS_REPOSITORY,
        ORDER_PAYMENTS,
        AUTHORIZATION,
        PAYMENT_PROVIDER,
        COMMISSION_POLICY,
        CLOCK,
        ENTROPY,
        ORGANIZATION_ACCESS,
      ],
    },
    PaymentProcessing,
  ],
  exports: [PAYMENTS_USE_CASES],
})
export class PaymentsModule {}
