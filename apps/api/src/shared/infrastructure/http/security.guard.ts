import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RATE_LIMITER, type RateLimiter } from '../../application/rate-limiter';
import { ApplicationError } from '../../domain/application-error';
import { CONFIG, type RuntimeConfig } from '../config';
const POLICY = 'pettly:rate-policy';
export const RatePolicy = (limit: number, seconds: number) =>
  SetMetadata(POLICY, { limit, seconds });
@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMITER) private readonly limiter: RateLimiter,
    @Inject(CONFIG) private readonly settings: RuntimeConfig,
  ) {}
  async canActivate(context: ExecutionContext) {
    const http = context.switchToHttp(),
      request = http.getRequest<Request>(),
      response = http.getResponse<Response>();
    const origin = request.get('Origin');
    if (origin && !this.settings.origins.includes(origin))
      throw new ApplicationError(
        'INVALID_INPUT',
        'The request origin is not allowed.',
      );
    if (
      [
        '/api',
        '/api/health',
        '/api/health/live',
        '/api/health/ready',
        '/api/metrics',
      ].includes(request.path)
    )
      return true;
    const policy = this.reflector.getAllAndOverride<{
      limit: number;
      seconds: number;
    }>(POLICY, [context.getHandler(), context.getClass()]) || {
      limit: 120,
      seconds: 60,
    };
    const route = `${request.method}:${request.route?.path || request.path}`;
    const checks = [
      {
        key: `ip:${request.ip}:${route}`,
        limit: policy.limit,
        seconds: policy.seconds,
      },
    ];
    if (typeof request.body?.email === 'string')
      checks.push({
        key: `account:${request.body.email.trim().toLowerCase()}:${route}`,
        limit: policy.limit,
        seconds: policy.seconds,
      });
    for (const check of checks) {
      const result = await this.limiter.consume(
        check.key,
        check.limit,
        check.seconds,
      );
      if (!result.allowed) {
        response.setHeader('Retry-After', result.retryAfter);
        throw new ApplicationError(
          'RATE_LIMITED',
          'Too many requests. Please try again later.',
        );
      }
    }
    return true;
  }
}
