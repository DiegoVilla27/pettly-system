import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { request as proxyRequest } from 'node:http';
import { gzipSync } from 'node:zlib';
const project = `pettly-admin-test-${process.pid}-${Date.now()}`;
const env = { ...process.env, PETTLY_TEST_PROJECT: project };
const docker = (args) =>
  execFileSync(
    'docker',
    ['compose', '-f', 'docker-compose.test.yml', ...args],
    { env, encoding: 'utf8' },
  );
const port = (service, number) =>
  Number(
    docker(['port', service, String(number)])
      .trim()
      .split(':')
      .at(-1),
  );
const allocate = async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const value = server.address().port;
  await new Promise((r) => server.close(r));
  return value;
};
const apiPort = await allocate(),
  adminPort = await allocate();
const origin = `http://127.0.0.1:${adminPort}`;
const children = [];
let server,
  logs = '',
  exitCode = 1;
try {
  docker(['up', '-d', '--wait', '--wait-timeout', '120']);
  const runtime = {
    ...env,
    NODE_ENV: 'test',
    PORT: String(apiPort),
    DATABASE_URL: `postgresql://pettly_test:test-only-password@127.0.0.1:${port('postgres', 5432)}/pettly_test?schema=public`,
    REDIS_URL: `redis://127.0.0.1:${port('redis', 6379)}`,
    REDIS_PREFIX: project,
    JWT_SECRET: randomBytes(48).toString('hex'),
    MAIL_ENCRYPTION_KEY: randomBytes(48).toString('hex'),
    METRICS_TOKEN: randomBytes(48).toString('hex'),
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(port('mailpit', 1025)),
    WEB_PUBLIC_URL: origin,
    CORS_ORIGINS: origin,
    ADMIN_TEST_URL: origin,
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
  if (migration.status !== 0) throw Error('Isolated migration failed.');
  for (const entry of ['apps/api/dist/main.js', 'apps/worker/dist/main.js']) {
    const child = spawn(process.execPath, [entry], {
      env: runtime,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    child.stdout.on('data', (chunk) => {
      logs += chunk;
    });
    child.stderr.on('data', (chunk) => {
      logs += chunk;
    });
  }
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if (
        (
          await fetch(runtime.API_TEST_URL + '/health/ready', {
            signal: AbortSignal.timeout(2000),
          })
        ).ok
      ) {
        ready = true;
        break;
      }
    } catch {
      /* Still starting. */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw Error('Isolated API did not start.');
  const password = 'A sufficiently long password!';
  for (const [email, name] of [
    ['admin@example.com', 'Ana'],
    ['customer@example.com', 'Carlos'],
  ]) {
    const register = await fetch(runtime.API_TEST_URL + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, lastName: 'Pettly', password }),
    });
    if (register.status !== 202) throw Error('Test registration failed.');
    let token;
    for (let attempt = 0; attempt < 100; attempt++) {
      const list = await (
        await fetch(runtime.MAILPIT_TEST_URL + '/api/v1/messages')
      ).json();
      const mail = list.messages?.find((m) =>
        m.To.some((t) => t.Address === email),
      );
      if (mail) {
        const detail = await (
          await fetch(runtime.MAILPIT_TEST_URL + '/api/v1/message/' + mail.ID)
        ).json();
        token = detail.Text.match(/token=([A-Za-z0-9_-]{43})/)?.[1];
        if (token) break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!token) throw Error('Test verification mail did not arrive.');
    const verified = await fetch(runtime.API_TEST_URL + '/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!verified.ok) throw Error('Test email verification failed.');
  }
  const bootstrap = spawnSync(
    process.execPath,
    ['apps/api/dist/main.js', '--bootstrap-super-admin', 'admin@example.com'],
    { env: runtime, stdio: 'inherit' },
  );
  if (bootstrap.status !== 0)
    throw Error('Isolated administrator bootstrap failed.');
  const directory = resolve('dist/apps/admin/browser');
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
  };
  server = createServer(async (req, res) => {
    if (req.url.startsWith('/api/')) {
      const proxy = proxyRequest(
        runtime.API_TEST_URL.replace('/api', '') + req.url,
        { method: req.method, headers: req.headers },
        (response) => {
          res.writeHead(response.statusCode, response.headers);
          response.pipe(res);
        },
      );
      proxy.on('error', () => {
        res.writeHead(502);
        res.end();
      });
      req.pipe(proxy);
      return;
    }
    try {
      let file = resolve(directory, '.' + new URL(req.url, origin).pathname);
      if (!file.startsWith(directory + '/')) file = directory + '/index.html';
      try {
        if (!(await stat(file)).isFile()) file = directory + '/index.html';
      } catch {
        file = directory + '/index.html';
      }
      const bytes = await readFile(file);
      const compressed = String(req.headers['accept-encoding']).includes(
        'gzip',
      );
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
        Vary: 'Accept-Encoding',
        ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
      });
      res.end(compressed ? gzipSync(bytes) : bytes);
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise((r) => server.listen(adminPort, '127.0.0.1', r));
  const result = spawn(
    'pnpm',
    [
      'exec',
      'playwright',
      'test',
      '--config',
      'apps/admin/playwright.config.ts',
    ],
    { env: runtime, stdio: 'inherit' },
  );
  exitCode = await new Promise((r) =>
    result.on('exit', (code) => r(code ?? 1)),
  );
  if (exitCode) process.stderr.write(logs);
} catch (error) {
  console.error(error);
  process.stderr.write(logs);
} finally {
  if (server) await new Promise((r) => server.close(r));
  for (const child of children) child.kill('SIGTERM');
  await Promise.all(
    children.map((child) =>
      child.exitCode === null
        ? new Promise((r) => child.on('exit', r))
        : Promise.resolve(),
    ),
  );
  docker(['down', '-v', '--remove-orphans']);
}
process.exitCode = exitCode;
