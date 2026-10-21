import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  PAYMENTS_USE_CASES,
  type PaymentsUseCases,
} from '../../../application/ports/in/payments-use-cases';
@Injectable()
export class PaymentProcessing implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly logger = new Logger(PaymentProcessing.name);
  constructor(
    @Inject(PAYMENTS_USE_CASES) private readonly payments: PaymentsUseCases,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 15000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.payments.runDue();
    } catch {
      this.logger.error(
        'Payment processing failed; durable jobs will be retried.',
      );
    } finally {
      this.running = false;
    }
  }
}
