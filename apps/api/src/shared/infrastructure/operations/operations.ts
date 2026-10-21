import {
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { Database } from '../database';
import { RedisConnection } from '../redis';
import { CONFIG, type RuntimeConfig } from '../config';
const buckets = [0.05, 0.1, 0.25, 0.5, 1, 2, 5];
class HealthDto extends createZodDto(
  z.strictObject({
    status: z.enum(['alive', 'ready', 'unavailable']),
    dependencies: z
      .strictObject({ database: z.boolean(), redis: z.boolean() })
      .optional(),
  }),
) {}
@Injectable()
export class OperationsTelemetry {
  private readonly rows = new Map<
    string,
    { count: number; sum: number; buckets: number[]; errors: number }
  >();
  middleware(req: Request, res: Response, next: NextFunction) {
    const started = performance.now();
    res.once('finish', () => {
      if (req.path.startsWith('/api/health/') || req.path === '/api/metrics')
        return;
      const route = String(req.route?.path ?? 'unmatched');
      const key =
        this.rows.size >= 200 && !this.rows.has(route) ? 'overflow' : route;
      const r = this.rows.get(key) ?? {
        count: 0,
        sum: 0,
        buckets: buckets.map(() => 0),
        errors: 0,
      };
      const seconds = (performance.now() - started) / 1000;
      r.count++;
      r.sum += seconds;
      if (res.statusCode >= 500) r.errors++;
      buckets.forEach((b, i) => {
        if (seconds <= b) r.buckets[i]++;
      });
      this.rows.set(key, r);
      process.stdout.write(
        JSON.stringify({
          level: res.statusCode >= 500 ? 'error' : 'info',
          event: 'http_request',
          requestId: res.getHeader('X-Request-Id'),
          method: req.method,
          route: key,
          status: res.statusCode,
          durationMs: Math.round(seconds * 1000),
        }) + '\n',
      );
    });
    next();
  }
  render() {
    const lines = [
      '# TYPE pettly_process_uptime_seconds gauge',
      `pettly_process_uptime_seconds ${process.uptime()}`,
      '# TYPE pettly_process_resident_memory_bytes gauge',
      `pettly_process_resident_memory_bytes ${process.memoryUsage().rss}`,
      '# TYPE pettly_http_requests_total counter',
      '# TYPE pettly_http_server_errors_total counter',
      '# TYPE pettly_http_duration_seconds histogram',
    ];
    for (const [route, r] of this.rows) {
      const label = `route=${JSON.stringify(route)}`;
      lines.push(
        `pettly_http_requests_total{${label}} ${r.count}`,
        `pettly_http_server_errors_total{${label}} ${r.errors}`,
        `pettly_http_duration_seconds_sum{${label}} ${r.sum}`,
        `pettly_http_duration_seconds_count{${label}} ${r.count}`,
      );
      buckets.forEach((b, i) =>
        lines.push(
          `pettly_http_duration_seconds_bucket{${label},le="${b}"} ${r.buckets[i]}`,
        ),
      );
      lines.push(
        `pettly_http_duration_seconds_bucket{${label},le="+Inf"} ${r.count}`,
      );
    }
    return lines.join('\n') + '\n';
  }
}
@ApiTags('Operations')
@Controller()
export class OperationsController {
  constructor(
    private readonly db: Database,
    private readonly redis: RedisConnection,
    private readonly telemetry: OperationsTelemetry,
    @Inject(CONFIG) private readonly settings: RuntimeConfig,
  ) {}
  @Get('health/live')
  @ApiOperation({
    operationId: 'getApiLiveness',
    summary: 'Check process liveness without external dependencies',
  })
  @ApiOkResponse({ type: HealthDto })
  @ZodSerializerDto(HealthDto)
  live() {
    return { status: 'alive' as const };
  }
  @Get('health/ready')
  @ApiOperation({
    operationId: 'getApiReadiness',
    summary: 'Check database and Redis readiness',
    description:
      'No authentication, no route limiter dependency, no hostnames/secrets. Returns 503 when a required dependency fails. SMTP and payment-provider activation are separate business/delivery concerns.',
  })
  @ApiOkResponse({ type: HealthDto })
  @ApiServiceUnavailableResponse({ type: HealthDto })
  @ZodSerializerDto(HealthDto)
  async ready(@Res({ passthrough: true }) res: Response) {
    const checks = await Promise.allSettled([
      this.db.prisma.$queryRaw`SELECT 1`,
      this.redis.client.ping(),
    ]);
    const database = checks[0].status === 'fulfilled',
      redis = checks[1].status === 'fulfilled';
    res.status(database && redis ? 200 : 503);
    return {
      status: database && redis ? 'ready' : 'unavailable',
      dependencies: { database, redis },
    };
  }
  @Get('metrics')
  @ApiProduces('text/plain')
  @ApiOperation({
    operationId: 'getOperationalMetrics',
    summary: 'Read bounded Prometheus operational metrics',
    description:
      'Dedicated Bearer METRICS_TOKEN required, independent of user JWT. Disabled with 503 unless configured. No addresses, query strings, bodies, tokens or concrete resource IDs in labels. HTTP latency/errors, process, notification backlog/failures and worker heartbeat; private network/loopback collection recommended.',
  })
  @ApiOkResponse({ schema: { type: 'string' } })
  @ApiServiceUnavailableResponse({
    description: 'Metrics are disabled or dependencies unavailable.',
  })
  async metrics(@Req() req: Request, @Res() res: Response) {
    const expected = this.settings.metricsToken;
    if (!expected)
      throw new HttpException(
        'Metrics are disabled.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    const received = req.get('Authorization') ?? '';
    const wanted = 'Bearer ' + expected;
    if (
      Buffer.byteLength(received) !== Buffer.byteLength(wanted) ||
      !timingSafeEqual(Buffer.from(received), Buffer.from(wanted))
    )
      throw new HttpException(
        'Metrics authorization required.',
        HttpStatus.UNAUTHORIZED,
      );
    try {
      const [rows, heartbeat] = await Promise.all([
        this.db.prisma.$queryRaw<
          { due: bigint; failed: bigint; lag: number }[]
        >`SELECT (SELECT COUNT(*) FROM notification_outbox WHERE "deliveredAt" IS NULL AND "failedAt" IS NULL AND "expiresAt">NOW() AND "notBefore"<=NOW()) AS due, (SELECT COUNT(*) FROM notification_outbox o WHERE "failureKind"='delivery_failed' AND "failedAt">NOW()-INTERVAL '24 hours' AND "deliveredAt" IS NULL AND NOT EXISTS(SELECT 1 FROM notification_outbox child WHERE child."retryOfId"=o.id)) AS failed, (SELECT COALESCE(EXTRACT(EPOCH FROM NOW()-MIN("notBefore")),0)::float FROM notification_outbox WHERE "deliveredAt" IS NULL AND "failedAt" IS NULL AND "expiresAt">NOW() AND "notBefore"<=NOW()) AS lag`,
        this.redis.client.get(this.settings.redisPrefix + ':worker:heartbeat'),
      ]);
      const row = rows[0];
      res
        .type('text/plain; version=0.0.4')
        .send(
          this.telemetry.render() +
            `# TYPE pettly_notification_due gauge\npettly_notification_due ${row.due}\n# TYPE pettly_notification_failed_24h gauge\npettly_notification_failed_24h ${row.failed}\n# TYPE pettly_notification_oldest_due_seconds gauge\npettly_notification_oldest_due_seconds ${row.lag}\n# TYPE pettly_worker_heartbeat gauge\npettly_worker_heartbeat ${heartbeat ? 1 : 0}\n`,
        );
    } catch {
      throw new HttpException(
        'Operational dependencies unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
@Module({
  controllers: [OperationsController],
  providers: [OperationsTelemetry],
  exports: [OperationsTelemetry],
})
export class OperationsModule {}
