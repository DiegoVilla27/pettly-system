import { Global, Module } from '@nestjs/common';
import { CONFIG, config } from './config';
import { Database } from './database';
import { RedisConnection } from './redis';
import { RedisRateLimiter } from './redis-rate-limiter';
import { RATE_LIMITER } from '../application/rate-limiter';
import {
  ACCESS_TOKENS,
  CLOCK,
  ENTROPY,
  PASSWORD_HASHER,
} from '../application/runtime-ports';
import {
  ArgonPasswordHasher,
  CryptoEntropy,
  JwtAccessTokens,
} from './security';
@Global()
@Module({
  providers: [
    { provide: CONFIG, useFactory: config },
    Database,
    RedisConnection,
    { provide: CLOCK, useValue: { now: () => new Date() } },
    { provide: ENTROPY, useClass: CryptoEntropy },
    { provide: PASSWORD_HASHER, useClass: ArgonPasswordHasher },
    {
      provide: ACCESS_TOKENS,
      useFactory: (settings) => new JwtAccessTokens(settings),
      inject: [CONFIG],
    },
    { provide: RATE_LIMITER, useClass: RedisRateLimiter },
  ],
  exports: [
    CONFIG,
    Database,
    RedisConnection,
    CLOCK,
    ENTROPY,
    PASSWORD_HASHER,
    ACCESS_TOKENS,
    RATE_LIMITER,
  ],
})
export class InfrastructureModule {}
