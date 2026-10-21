import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  BOOKINGS_USE_CASES,
  type BookingsUseCases,
} from '../../../application/ports/in/bookings-use-cases';
@Injectable()
export class BookingExpiry implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly log = new Logger(BookingExpiry.name);
  constructor(
    @Inject(BOOKINGS_USE_CASES) private readonly use: BookingsUseCases,
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
      await this.use.expireDue();
    } catch {
      this.log.error(
        'Booking expiry failed; persisted deadlines will be retried.',
      );
    } finally {
      this.running = false;
    }
  }
}
