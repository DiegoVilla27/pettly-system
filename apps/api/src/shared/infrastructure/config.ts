import 'dotenv/config';
import { percentageToBasisPoints } from '../domain/payment-allocation';
function secret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32)
    throw new Error(`${name} must contain at least 32 characters.`);
  return value;
}
function positive(name: string, fallback: number): number {
  const value = Number(process.env[name] || fallback);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive integer.`);
  return value;
}
export function config() {
  const production = process.env.NODE_ENV === 'production';
  const origins = (
    process.env.CORS_ORIGINS ||
    'http://localhost:3001,http://localhost:4200,http://localhost:3101,http://localhost:4300'
  )
    .split(',')
    .map((s) => new URL(s.trim()).origin);
  const webUrl = process.env.WEB_PUBLIC_URL || 'http://localhost:3001';
  if (
    production &&
    new URL(webUrl).protocol !== 'https:' &&
    process.env.ALLOW_INSECURE_LOCAL_DEV !== 'true'
  )
    throw new Error('Production WEB_PUBLIC_URL must use HTTPS.');
  return {
    metricsToken: process.env.METRICS_TOKEN
      ? secret('METRICS_TOKEN')
      : undefined,
    commissionBasisPoints: percentageToBasisPoints(
      process.env.PETTLY_COMMISSION_PERCENT ?? '10',
    ),
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwtSecret: secret('JWT_SECRET'),
    mailKey: secret('MAIL_ENCRYPTION_KEY'),
    accessSeconds: positive('ACCESS_TOKEN_SECONDS', 900),
    refreshSeconds: positive('REFRESH_TOKEN_SECONDS', 2592000),
    verificationSeconds: positive('VERIFICATION_TOKEN_SECONDS', 86400),
    resetSeconds: positive('RESET_TOKEN_SECONDS', 1800),
    origins,
    webUrl,
    secureCookies:
      production && process.env.ALLOW_INSECURE_LOCAL_DEV !== 'true',
    redisPrefix: process.env.REDIS_PREFIX || 'pettly:dev',
    smtpHost: process.env.SMTP_HOST || 'localhost',
    smtpPort: positive('SMTP_PORT', 1025),
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    mailFrom: process.env.MAIL_FROM || 'Pettly <support@pettly.test>',
    port: positive('PORT', 3000),
    swagger:
      process.env.SWAGGER_ENABLED === 'true' ||
      (!production && process.env.SWAGGER_ENABLED !== 'false'),
  };
}
export type RuntimeConfig = ReturnType<typeof config>;
export const CONFIG = Symbol('CONFIG');
