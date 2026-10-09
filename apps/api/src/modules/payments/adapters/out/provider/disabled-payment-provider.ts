import { ApplicationError } from '../../../../../shared/domain/application-error';
import type { PaymentProvider } from '../../../application/ports/out/payment-provider';
import type {
  PaymentState,
  ProviderObservation,
} from '../../../application/results/payment';
export class DisabledPaymentProvider implements PaymentProvider {
  readonly name = 'unconfigured';
  readonly enabled = false;
  async createCheckout(
    _payment: PaymentState,
  ): Promise<{ reference: string; url: string }> {
    void _payment;
    throw new ApplicationError(
      'DEPENDENCY_UNAVAILABLE',
      'The payment provider has not been configured.',
    );
  }
  async lookup(_payment: PaymentState): Promise<ProviderObservation> {
    void _payment;
    throw new ApplicationError(
      'DEPENDENCY_UNAVAILABLE',
      'The payment provider has not been configured.',
    );
  }
}
