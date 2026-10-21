import { Inject, Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { RateLimiter } from '../application/rate-limiter';
import { ApplicationError } from '../domain/application-error';
import { CONFIG, type RuntimeConfig } from './config';
import { RedisConnection } from './redis';
const SCRIPT = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}`;
@Injectable()
export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly redis: RedisConnection,
    @Inject(CONFIG) private readonly settings: RuntimeConfig,
  ) {}
  async consume(key: string, limit: number, windowSeconds: number) {
    try {
      const digest = createHmac('sha256', this.settings.jwtSecret)
        .update(key)
        .digest('hex');
      const result = (await this.redis.client.eval(
        SCRIPT,
        1,
        `${this.settings.redisPrefix}:rate:${digest}`,
        String(windowSeconds),
      )) as [number, number];
      return {
        allowed: result[0] <= limit,
        retryAfter: Math.max(1, result[1]),
      };
    } catch {
      throw new ApplicationError(
        'DEPENDENCY_UNAVAILABLE',
        'Security controls are temporarily unavailable.',
      );
    }
  }
}
