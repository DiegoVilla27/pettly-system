export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}
export interface RateLimiter {
  consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult>;
}
export const RATE_LIMITER = Symbol('RATE_LIMITER');
