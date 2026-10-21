import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSeedTarget,
  SEED_ACCOUNTS,
  SEED_PASSWORD,
} from './seed-policy.mjs';
const env = {
  DATABASE_URL:
    'postgresql://pettly_dev:local@localhost:5432/pettly_db?schema=public',
  DATABASE_URL_DOCKER:
    'postgresql://pettly_dev:local@global_postgres:5432/pettly_db?schema=public',
  REDIS_PREFIX: 'pettly:dev',
  ALLOW_INSECURE_LOCAL_DEV: 'true',
  JWT_SECRET: 'test-only',
  PETTLY_BACKUP_KEY: 'a'.repeat(64),
};
const args = ['--reset', 'pettly_db'];
test('reset needs explicit Pettly target and accepts only dedicated local identity', () => {
  assert.equal(assertSeedTarget(env, args).pathname, '/pettly_db');
  for (const input of [
    [],
    ['--reset'],
    ['--reset', 'other_db'],
    [...args, '--force'],
  ])
    assert.throws(() => assertSeedTarget(env, input));
});
test('rejects production, remote servers, admin users, other schema/database/prefix and mismatched Docker config', () => {
  for (const override of [
    { NODE_ENV: 'production' },
    { ALLOW_INSECURE_LOCAL_DEV: 'false' },
    { REDIS_PREFIX: 'another:dev' },
    { JWT_SECRET: '' },
    { PETTLY_BACKUP_KEY: '' },
    { DATABASE_URL: env.DATABASE_URL.replace('localhost', 'db.example.com') },
    { DATABASE_URL: env.DATABASE_URL.replace('pettly_dev:', 'postgres:') },
    {
      DATABASE_URL: env.DATABASE_URL.replace('/pettly_db', '/task_manager_db'),
    },
    { DATABASE_URL: env.DATABASE_URL.replace('schema=public', 'schema=other') },
    {
      DATABASE_URL_DOCKER: env.DATABASE_URL_DOCKER.replace(
        'global_postgres',
        'production_postgres',
      ),
    },
    {
      DATABASE_URL_DOCKER: env.DATABASE_URL_DOCKER.replace(
        ':local@',
        ':different@',
      ),
    },
  ])
    assert.throws(() => assertSeedTarget({ ...env, ...override }, args));
});
test('all identities are synthetic, unique, documented roles and compatible passwords', () => {
  assert.equal(
    new Set(SEED_ACCOUNTS.map((a) => a.email)).size,
    SEED_ACCOUNTS.length,
  );
  assert.ok(SEED_ACCOUNTS.every((a) => a.email.endsWith('@pettly.test')));
  assert.deepEqual([...new Set(SEED_ACCOUNTS.map((a) => a.role))].sort(), [
    'moderator',
    'super_admin',
    'user',
  ]);
  assert.ok(SEED_PASSWORD.length >= 12 && SEED_PASSWORD.length <= 128);
});

test('manual guide lists every synthetic credential and the pending invitation', async () => {
  const { readFile } = await import('node:fs/promises');
  const guide = await readFile(
    new URL('../../docs/seeds.md', import.meta.url),
    'utf8',
  );
  for (const account of SEED_ACCOUNTS)
    assert.ok(guide.includes('`' + account.email + '`'), account.email);
  assert.ok(guide.includes('`' + SEED_PASSWORD + '`'));
  assert.ok(guide.includes('`invited@pettly.test`'));
});
