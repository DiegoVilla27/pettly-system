import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
const require = createRequire(
  new URL('../../apps/api/package.json', import.meta.url),
);
require('dotenv').config({
  path: process.env.PETTLY_ENV_FILE ?? '.env',
  quiet: true,
});
const url = new URL(
  process.env.DATABASE_URL_DOCKER ??
    process.env.DATABASE_URL ??
    'http://invalid',
);
if (
  !/^\/pettly_[a-z0-9_]+$/.test(url.pathname) ||
  !/^pettly_[a-z0-9_]+$/.test(url.username)
)
  throw Error(
    'Scheduled backup requires an explicitly configured dedicated Pettly database/role.',
  );
const env = {
  ...process.env,
  PETTLY_DB_PASSWORD: decodeURIComponent(url.password),
};
const file = join(
  resolve(process.env.PETTLY_BACKUP_DIR ?? 'backups'),
  `pettly-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(4).toString('hex')}.pettly`,
);
execFileSync(
  process.execPath,
  [
    'scripts/ops/backup.mjs',
    'create',
    '--container',
    process.env.PETTLY_POSTGRES_CONTAINER ?? 'global_postgres',
    '--database',
    url.pathname.slice(1),
    '--user',
    decodeURIComponent(url.username),
    '--file',
    file,
  ],
  { env, stdio: 'inherit' },
);
if (process.argv.includes('--verify'))
  execFileSync(
    process.execPath,
    ['scripts/ops/backup.mjs', 'verify', '--file', file],
    { env, stdio: 'inherit' },
  );
