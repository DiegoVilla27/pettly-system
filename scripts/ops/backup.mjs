import { spawn, execFileSync } from 'node:child_process';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { resolve, dirname } from 'node:path';
const headerMagic = Buffer.from('PETTLY-BACKUP-1\n');
const args = process.argv.slice(2),
  mode = args.shift();
const option = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
const file = resolve(option('--file') ?? '');
const key = process.env.PETTLY_BACKUP_KEY;
if (
  !['create', 'verify'].includes(mode) ||
  !option('--file') ||
  !key ||
  !/^[0-9a-f]{64}$/i.test(key)
)
  throw Error(
    'Use create/verify --file PATH with a separately stored 64-hex PETTLY_BACKUP_KEY.',
  );
const hash = async (path) => {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path)) h.update(chunk);
  return h.digest('hex');
};
const run = (params, input) =>
  execFileSync('docker', params, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PGPASSWORD: process.env.PETTLY_DB_PASSWORD ?? '' },
  });
const inventory = (container, database, user) =>
  JSON.parse(
    run([
      'exec',
      '--env',
      'PGPASSWORD',
      container,
      'psql',
      '-X',
      '-A',
      '-t',
      '-U',
      user,
      '-d',
      database,
      '-c',
      `SELECT json_build_object('users',(SELECT count(*) FROM users),'orders',(SELECT count(*) FROM orders),'bookings',(SELECT count(*) FROM bookings),'credentials',(SELECT count(*) FROM veterinary_credentials),'notifications',(SELECT count(*) FROM notification_inbox),'migration',(SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1))`,
    ]),
  );
if (mode === 'create') {
  const container = option('--container'),
    database = option('--database') ?? 'pettly_db',
    user = option('--user') ?? 'pettly_dev';
  if (
    !container ||
    !/^[a-zA-Z0-9_.-]+$/.test(container) ||
    !/^pettly_[a-z0-9_]+$/.test(database) ||
    !/^pettly_[a-z0-9_]+$/.test(user)
  )
    throw Error('Explicit Pettly container/database/user required.');
  await fs.mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  cipher.setAAD(headerMagic);
  await fs.writeFile(file, Buffer.concat([headerMagic, iv]), {
    flag: 'wx',
    mode: 0o600,
  });
  try {
    const child = spawn(
      'docker',
      [
        'exec',
        '--env',
        'PGPASSWORD',
        container,
        'pg_dump',
        '-U',
        user,
        '-d',
        database,
        '--format=custom',
        '--no-owner',
        '--no-acl',
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: process.env.PETTLY_DB_PASSWORD ?? '',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    child.stderr.resume();
    const exit = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0 ? resolve() : reject(Error('Database dump failed.')),
      );
    });
    await Promise.all([
      pipeline(
        child.stdout,
        cipher,
        createWriteStream(file, { flags: 'a', mode: 0o600 }),
      ),
      exit,
    ]);
    await fs.appendFile(file, cipher.getAuthTag());
    const handle = await fs.open(file, 'r');
    await handle.sync();
    await handle.close();
    const manifest = {
      format: 1,
      createdAt: new Date().toISOString(),
      database,
      sha256: await hash(file),
      inventory: inventory(container, database, user),
    };
    await fs.writeFile(
      file + '.json',
      JSON.stringify(manifest, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        event: 'encrypted_backup_created',
        file,
        bytes: (await fs.stat(file)).size,
        sha256: manifest.sha256,
      }),
    );
  } catch {
    await fs.unlink(file).catch(() => undefined);
    throw Error('Backup failed; incomplete archive removed.');
  }
} else {
  const manifest = JSON.parse(await fs.readFile(file + '.json', 'utf8'));
  if (manifest.format !== 1 || (await hash(file)) !== manifest.sha256)
    throw Error('Archive checksum verification failed.');
  const size = (await fs.stat(file)).size,
    handle = await fs.open(file, 'r'),
    header = Buffer.alloc(headerMagic.length + 12),
    tag = Buffer.alloc(16);
  await handle.read(header, 0, header.length, 0);
  await handle.read(tag, 0, 16, size - 16);
  await handle.close();
  if (!header.subarray(0, headerMagic.length).equals(headerMagic))
    throw Error('Unknown archive format.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    header.subarray(headerMagic.length),
  );
  decipher.setAAD(headerMagic);
  decipher.setAuthTag(tag);
  // Authenticate the complete archive before pg_restore can execute any SQL.
  // GCM streaming decryption emits bytes before validating the final tag.
  const authentication = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    header.subarray(headerMagic.length),
  );
  authentication.setAAD(headerMagic);
  authentication.setAuthTag(tag);
  try {
    await pipeline(
      createReadStream(file, { start: header.length, end: size - 17 }),
      authentication,
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    );
  } catch {
    throw Error('Archive authentication failed; no SQL was executed.');
  }
  const container = 'pettly-restore-check-' + process.pid + '-' + Date.now(),
    image = process.env.PETTLY_BACKUP_IMAGE ?? 'postgres:17-alpine';
  if (!/^postgres:[0-9]+(?:\.[0-9]+)?-alpine$/.test(image))
    throw Error(
      'Use a pinned official PostgreSQL Alpine image matching the source major.',
    );
  try {
    run([
      'run',
      '--detach',
      '--rm',
      '--name',
      container,
      '--network',
      'none',
      '--memory',
      '1g',
      '--cpus',
      '2',
      '--env',
      'POSTGRES_USER=pettly_restore',
      '--env',
      'POSTGRES_DB=pettly_restore',
      '--env',
      'POSTGRES_PASSWORD=' + randomBytes(32).toString('hex'),
      image,
    ]);
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        run([
          'exec',
          container,
          'pg_isready',
          '-h',
          '127.0.0.1',
          '-U',
          'pettly_restore',
          '-d',
          'pettly_restore',
        ]);
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!ready) throw Error('Isolated restore server did not start.');
    const child = spawn(
      'docker',
      [
        'exec',
        '-i',
        container,
        'pg_restore',
        '--exit-on-error',
        '--no-owner',
        '--no-acl',
        '-U',
        'pettly_restore',
        '-d',
        'pettly_restore',
      ],
      { stdio: ['pipe', 'ignore', 'pipe'] },
    );
    let restoreDiagnostic = '';
    child.stderr.on('data', (chunk) => {
      if (restoreDiagnostic.length < 8192)
        restoreDiagnostic += chunk.toString();
    });
    const exit = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0
          ? resolve()
          : reject(
              Error(
                'Isolated restore failed. ' +
                  (/connection to server/.test(restoreDiagnostic)
                    ? 'PostgreSQL connection unavailable.'
                    : /permission denied/.test(restoreDiagnostic)
                      ? 'PostgreSQL permissions rejected restoration.'
                      : 'Check PostgreSQL schema/image compatibility and constraints.'),
              ),
            ),
      );
    });
    await Promise.all([
      pipeline(
        createReadStream(file, { start: header.length, end: size - 17 }),
        decipher,
        child.stdin,
      ),
      exit,
    ]);
    const restored = inventory(container, 'pettly_restore', 'pettly_restore');
    if (JSON.stringify(restored) !== JSON.stringify(manifest.inventory))
      throw Error(
        'Restored critical inventory does not match backup manifest; retry while source writes are quiesced.',
      );
    console.log(
      JSON.stringify({
        event: 'isolated_restore_verified',
        file,
        inventory: restored,
        durationPolicy:
          'Full SQL restore, AES-GCM authentication and critical inventory/migration comparison; no shared target is modified.',
      }),
    );
  } finally {
    try {
      run(['rm', '--force', container]);
    } catch {
      /* Container might not have started. */
    }
  }
}
