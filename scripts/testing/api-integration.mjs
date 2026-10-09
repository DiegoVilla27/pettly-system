import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { createServer } from 'node:net';
const project = `pettly-auth-test-${process.pid}-${Date.now()}`;
const env = { ...process.env, PETTLY_TEST_PROJECT: project };
const args = ['compose', '-f', 'docker-compose.test.yml'];
const docker = (extra) =>
  execFileSync('docker', [...args, ...extra], { env, encoding: 'utf8' });
const port = (service, container) =>
  Number(
    docker(['port', service, String(container)])
      .trim()
      .split(':')
      .at(-1),
  );
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const apiPort = server.address().port;
await new Promise((resolve) => server.close(resolve));
// Docker may assign a different ephemeral published port after stop/start.
// Reserve one explicit free host port for this project's Redis recovery drill.
const redisServer = createServer();
await new Promise((resolve) => redisServer.listen(0, '127.0.0.1', resolve));
env.PETTLY_REDIS_TEST_PORT = String(redisServer.address().port);
await new Promise((resolve) => redisServer.close(resolve));
const children = [];
let exitCode = 1;
try {
  docker(['up', '-d', '--wait', '--wait-timeout', '120']);
  const runtime = {
    ...env,
    NODE_ENV: 'test',
    METRICS_TOKEN: randomBytes(48).toString('hex'),
    PETTLY_COMMISSION_PERCENT: '10',
    PORT: String(apiPort),
    DATABASE_URL: `postgresql://pettly_test:test-only-password@127.0.0.1:${port('postgres', 5432)}/pettly_test?schema=public`,
    REDIS_URL: `redis://127.0.0.1:${port('redis', 6379)}`,
    REDIS_PREFIX: project,
    JWT_SECRET: randomBytes(48).toString('hex'),
    MAIL_ENCRYPTION_KEY: randomBytes(48).toString('hex'),
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(port('mailpit', 1025)),
    WEB_PUBLIC_URL: 'http://localhost:3001',
    CORS_ORIGINS: 'http://localhost:3001',
    API_TEST_URL: `http://127.0.0.1:${apiPort}/api`,
    MAILPIT_TEST_URL: `http://127.0.0.1:${port('mailpit', 8025)}`,
  };
  const migration = spawnSync(
    'pnpm',
    [
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'apps/api/prisma/schema.prisma',
    ],
    { env: runtime, stdio: 'inherit' },
  );
  if (migration.status !== 0) throw new Error('Integration migration failed.');
  let logs = '';
  for (const entry of ['apps/api/dist/main.js', 'apps/worker/dist/main.js']) {
    const child = spawn(process.execPath, [entry], {
      env: runtime,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    child.stdout.on('data', (data) => {
      logs += data;
    });
    child.stderr.on('data', (data) => {
      logs += data;
    });
  }
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(runtime.API_TEST_URL)).ok) {
        ready = true;
        break;
      }
    } catch {
      // The API is still booting; retry until the deadline.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) {
    process.stderr.write(logs);
    throw new Error('Integration API did not start.');
  }
  const result = spawnSync(
    process.execPath,
    ['--test', 'apps/api/tests/integration/auth-http.test.mjs'],
    { env: runtime, stdio: 'inherit' },
  );
  exitCode = result.status ?? 1;
  if (exitCode) process.stderr.write(logs);
  if (!exitCode) {
    const directory = await fs.mkdtemp(join(tmpdir(), 'pettly-ops-test-'));
    const operational = {
      ...runtime,
      PETTLY_BACKUP_KEY: randomBytes(32).toString('hex'),
    };
    const archive = join(directory, 'snapshot.pettly');
    try {
      docker(['stop', 'redis']);
      try {
        const unavailable = await fetch(
          runtime.API_TEST_URL + '/health/ready',
          { signal: AbortSignal.timeout(10000) },
        );
        const alive = await fetch(runtime.API_TEST_URL + '/health/live', {
          signal: AbortSignal.timeout(5000),
        });
        if (unavailable.status !== 503 || alive.status !== 200)
          throw Error('Readiness/liveness failure separation failed.');
      } finally {
        docker(['start', 'redis']);
      }
      let recovered = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        try {
          const response = await fetch(runtime.API_TEST_URL + '/health/ready', {
            signal: AbortSignal.timeout(3000),
          });
          if (response.ok) {
            recovered = true;
            break;
          }
        } catch {
          // Redis reconnection must finish before measuring normal traffic.
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (!recovered) throw Error('Isolated dependencies did not recover.');
      const container = docker(['ps', '-q', 'postgres']).trim();
      execFileSync(
        process.execPath,
        [
          'scripts/ops/load.mjs',
          '--url',
          runtime.API_TEST_URL,
          '--seconds',
          '3',
          '--concurrency',
          '2',
          '--out',
          join(directory, 'load.json'),
        ],
        { env: operational, stdio: 'inherit' },
      );
      execFileSync(
        process.execPath,
        [
          'scripts/ops/backup.mjs',
          'create',
          '--container',
          container,
          '--database',
          'pettly_test',
          '--user',
          'pettly_test',
          '--file',
          archive,
        ],
        { env: operational, stdio: 'inherit' },
      );
      execFileSync(
        process.execPath,
        ['scripts/ops/backup.mjs', 'verify', '--file', archive],
        { env: operational, stdio: 'inherit' },
      );
      const manifest = JSON.parse(await fs.readFile(archive + '.json', 'utf8'));
      manifest.sha256 = 'invalid';
      await fs.writeFile(archive + '.json', JSON.stringify(manifest));
      const corrupted = spawnSync(
        process.execPath,
        ['scripts/ops/backup.mjs', 'verify', '--file', archive],
        { env: operational, stdio: 'pipe' },
      );
      if (corrupted.status === 0)
        throw Error('Corrupt backup was incorrectly accepted.');
      // Restore the valid manifest so the key test reaches GCM authentication.
      manifest.sha256 = createHash('sha256')
        .update(await fs.readFile(archive))
        .digest('hex');
      await fs.writeFile(archive + '.json', JSON.stringify(manifest));
      const keyRejected = spawnSync(
        process.execPath,
        ['scripts/ops/backup.mjs', 'verify', '--file', archive],
        {
          env: {
            ...operational,
            PETTLY_BACKUP_KEY: randomBytes(32).toString('hex'),
          },
          encoding: 'utf8',
          stdio: 'pipe',
        },
      );
      if (
        keyRejected.status === 0 ||
        !keyRejected.stderr.includes(
          'Archive authentication failed; no SQL was executed.',
        )
      )
        throw Error('Wrong backup key did not fail before SQL execution.');
      const manipulated = await fs.readFile(archive);
      manipulated[100] ^= 1;
      await fs.writeFile(archive, manipulated);
      manifest.sha256 = createHash('sha256').update(manipulated).digest('hex');
      await fs.writeFile(archive + '.json', JSON.stringify(manifest));
      const authenticationRejected = spawnSync(
        process.execPath,
        ['scripts/ops/backup.mjs', 'verify', '--file', archive],
        { env: operational, encoding: 'utf8', stdio: 'pipe' },
      );
      if (
        authenticationRejected.status === 0 ||
        !authenticationRejected.stderr.includes(
          'Archive authentication failed; no SQL was executed.',
        )
      )
        throw Error(
          'Tampered archive was accepted after checksum recalculation.',
        );
      console.log(
        'Operations: encrypted backup, isolated restore, corruption rejection and bounded load verified.',
      );
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
} catch (error) {
  exitCode = 1;
  process.stderr.write(`${error.message}\n`);
} finally {
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null) return resolve();
          child.once('exit', resolve);
          child.kill('SIGTERM');
          const timeout = setTimeout(() => {
            child.kill('SIGKILL');
            resolve();
          }, 10000);
          timeout.unref();
        }),
    ),
  );
  try {
    docker(['down', '--volumes', '--remove-orphans']);
  } catch {
    exitCode = 1;
  }
}
process.exitCode = exitCode;
