import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  INVENTORY_USE_CASES,
  type InventoryUseCases,
} from '../../../application/ports/in/inventory-use-cases';
@Injectable()
export class HoldExpiration implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(HoldExpiration.name);
  constructor(
    @Inject(INVENTORY_USE_CASES) private readonly inventory: InventoryUseCases,
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
      await this.inventory.expireDue();
    } catch {
      this.logger.error(
        'Inventory expiry failed; persisted deadlines will be retried.',
      );
    } finally {
      this.running = false;
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
