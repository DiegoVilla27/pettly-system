import { Module } from '@nestjs/common';
import { CONFIG, type RuntimeConfig } from '../../shared/infrastructure/config';
import { COMMISSION_POLICY } from './application/ports/in/commission-policy';
import { EnvironmentCommissionPolicy } from './adapters/out/config/environment-commission-policy';
@Module({
  providers: [
    {
      provide: COMMISSION_POLICY,
      useFactory: (c: RuntimeConfig) =>
        new EnvironmentCommissionPolicy(c.commissionBasisPoints),
      inject: [CONFIG],
    },
  ],
  exports: [COMMISSION_POLICY],
})
export class PaymentPolicyModule {}
