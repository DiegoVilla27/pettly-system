import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  ORDERS_USE_CASES,
  type OrdersUseCases,
} from '../../../application/ports/in/orders-use-cases';
@Injectable()
export class OrderExpiration implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(OrderExpiration.name);
  constructor(
    @Inject(ORDERS_USE_CASES) private readonly orders: OrdersUseCases,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 15000);
    this.timer.unref();
    void this.tick();
  }
  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.orders.expireDue();
    } catch {
      this.logger.error(
        'Order expiry failed; persisted deadlines will be retried.',
      );
    } finally {
      this.running = false;
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
