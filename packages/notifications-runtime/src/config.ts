import 'dotenv/config';
export function config() {
  const mailKey = process.env.MAIL_ENCRYPTION_KEY;
  if (!mailKey || mailKey.length < 32)
    throw new Error('MAIL_ENCRYPTION_KEY must contain at least 32 characters.');
  const smtpPort = Number(process.env.SMTP_PORT || 1025);
  if (!Number.isSafeInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535)
    throw new Error('SMTP_PORT must be a valid port number.');
  const webUrl = process.env.WEB_PUBLIC_URL || 'http://localhost:3001';
  if (
    process.env.NODE_ENV === 'production' &&
    new URL(webUrl).protocol !== 'https:' &&
    process.env.ALLOW_INSECURE_LOCAL_DEV !== 'true'
  )
    throw new Error('Production WEB_PUBLIC_URL must use HTTPS.');
  return {
    mailKey,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisPrefix: process.env.REDIS_PREFIX || 'pettly:dev',
    smtpHost: process.env.SMTP_HOST || 'localhost',
    smtpPort,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    mailFrom: process.env.MAIL_FROM || 'Pettly <support@pettly.test>',
    webUrl,
  };
}
export type RuntimeConfig = ReturnType<typeof config>;
