export const SEED_PASSWORD = 'PettlyDemo2026!';
export const SEED_ACCOUNTS = [
  ['superadmin', 'Sofía', 'super_admin'],
  ['superadmin.backup', 'Andrés', 'super_admin'],
  ['moderator', 'Camila', 'moderator'],
  ['business.admin', 'Laura', 'user'],
  ['business.operator', 'Mateo', 'user'],
  ['business.other', 'Daniel', 'user'],
  ['shelter.admin', 'Valentina', 'user'],
  ['shelter.operator', 'Nicolás', 'user'],
  ['multirole', 'Mariana', 'user'],
  ['vet.approved', 'Lucía', 'user'],
  ['vet.pending', 'Santiago', 'user'],
  ['suspended.admin', 'Isabella', 'user'],
  ['applicant', 'Gabriel', 'user'],
  ['customer', 'Carlos', 'user'],
  ['customer.second', 'Sara', 'user'],
  ['disabled', 'Tomás', 'user'],
  ['unverified', 'Elena', 'user'],
  ['disposable', 'Alejandro', 'user'],
].map(([key, name, role]) => ({
  key,
  name,
  role,
  email: `${key}@pettly.test`,
}));

export function assertSeedTarget(env, args) {
  if (args.length !== 2 || args[0] !== '--reset' || args[1] !== 'pettly_db')
    throw Error(
      'Use pnpm db:seed:demo --reset pettly_db. This deletes Pettly development data.',
    );
  const db = new URL(env.DATABASE_URL || 'http://invalid');
  const dockerDb = new URL(env.DATABASE_URL_DOCKER || 'http://invalid');
  if (
    env.NODE_ENV === 'production' ||
    env.ALLOW_INSECURE_LOCAL_DEV !== 'true' ||
    env.REDIS_PREFIX !== 'pettly:dev' ||
    !['localhost', '127.0.0.1'].includes(db.hostname) ||
    db.pathname !== '/pettly_db' ||
    db.username !== 'pettly_dev' ||
    dockerDb.hostname !== 'global_postgres' ||
    dockerDb.pathname !== db.pathname ||
    dockerDb.username !== db.username ||
    dockerDb.password !== db.password ||
    (db.searchParams.get('schema') || 'public') !== 'public' ||
    (dockerDb.searchParams.get('schema') || 'public') !== 'public' ||
    !env.JWT_SECRET ||
    !/^[0-9a-f]{64}$/i.test(env.PETTLY_BACKUP_KEY || '')
  )
    throw Error(
      'Demo reset requires local pettly_db/pettly_dev, shared-network Docker, pettly:dev, local-development opt-in and an encryption key.',
    );
  return db;
}
