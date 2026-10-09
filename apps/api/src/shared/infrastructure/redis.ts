import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { CONFIG, type RuntimeConfig } from './config';
@Injectable()
export class RedisConnection implements OnModuleDestroy {
  readonly client: Redis;
  constructor(@Inject(CONFIG) settings: RuntimeConfig) {
    this.client = new Redis(settings.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });
    this.client.on('error', () => undefined);
  }
  async onModuleDestroy() {
    await this.client.quit().catch(() => this.client.disconnect());
  }
}
