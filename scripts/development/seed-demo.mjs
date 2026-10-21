import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, open, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  assertSeedTarget,
  SEED_ACCOUNTS,
  SEED_PASSWORD,
} from './seed-policy.mjs';

const require = createRequire(resolve('apps/api/package.json'));
require('dotenv').config({ quiet: true });
const target = assertSeedTarget(
  process.env,
  process.argv.slice(2).filter((a) => a !== '--'),
);
const compose = (args) =>
  execFileSync('docker', ['compose', '-f', 'docker-compose.yml', ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
const apiUrl = `http://127.0.0.1:${Number(process.env.API_PORT || 3100)}/api`;
const reason =
  'Synthetic Pettly demo fixture for manual backoffice testing only.';
const db = new PrismaClient();
const jwt = require('jsonwebtoken');
const argon = require('argon2');
const sessions = [];
const actors = {};
const manifest = {
  createdAt: new Date().toISOString(),
  accounts: {},
  organizations: {},
  products: [],
  services: [],
  bookings: [],
  animals: [],
  publications: [],
  adoptionRequests: [],
  credentials: [],
  orders: [],
  payments: [],
};
let stopped = false,
  locked = false;
const fingerprint = (value) => createHash('sha256').update(value).digest('hex');

async function call(actor, method, path, body) {
  const headers = actor ? { Authorization: `Bearer ${actor.token}` } : {};
  if (body !== undefined && !(body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  const response = await fetch(apiUrl + path, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const value = await response.json();
  if (!response.ok)
    throw Error(
      `${method} ${path}: ${response.status} ${value.code || ''} ${value.message || ''} ${JSON.stringify(value.details || [])}`,
    );
  return value;
}
async function actor(key) {
  if (actors[key]) return actors[key];
  const user = await db.user.findUniqueOrThrow({
    where: { email: `${key}@pettly.test` },
  });
  const sid = randomUUID();
  await db.session.create({
    data: {
      id: sid,
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  sessions.push(sid);
  const token = jwt.sign({ sid }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: 'pettly-api',
    audience: 'pettly-clients',
    expiresIn: 3600,
  });
  return (actors[key] = { id: user.id, token });
}
async function upload(owner, path, version, kind) {
  // Deliberately synthetic images, labelled DEMO; never real professional evidence.
  const svg = Buffer.from(
    '<svg width="640" height="400"><rect width="640" height="400" fill="#e0e9dc"/><text x="30" y="180" font-size="44">PETTLY DEMO</text><text x="30" y="240" font-size="24">Synthetic test fixture</text></svg>',
  );
  const image = await require('sharp')(svg).png().toBuffer();
  const form = new FormData();
  form.append('file', new Blob([image], { type: 'image/png' }), 'demo.png');
  form.append('reason', reason);
  form.append('expectedVersion', String(version));
  if (kind) form.append('kind', kind);
  return call(owner, 'POST', path, form);
}
async function ready() {
  for (let i = 0; i < 60; i++) {
    try {
      if (
        (
          await fetch(apiUrl + '/health/ready', {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      )
        return;
    } catch {
      /* Startup. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error('Local Docker API did not become ready.');
}

try {
  await mkdir('tmp', { recursive: true });
  await (await open('tmp/demo-seed.lock', 'wx', 0o600)).close();
  locked = true;
  // Compare the live container before any destructive operation; never print secrets.
  const live = JSON.parse(
    compose([
      'exec',
      '-T',
      'api',
      'node',
      '-e',
      `const c=require('crypto'),u=new URL(process.env.DATABASE_URL); console.log(JSON.stringify({host:u.hostname,db:u.pathname,user:u.username,password:c.createHash('sha256').update(u.password).digest('hex'),jwt:c.createHash('sha256').update(process.env.JWT_SECRET).digest('hex'),prefix:process.env.REDIS_PREFIX,local:process.env.ALLOW_INSECURE_LOCAL_DEV,smtp:process.env.SMTP_HOST}))`,
    ]).toString(),
  );
  if (
    live.host !== 'global_postgres' ||
    live.db !== '/pettly_db' ||
    live.user !== 'pettly_dev' ||
    live.password !== fingerprint(target.password) ||
    live.jwt !== fingerprint(process.env.JWT_SECRET) ||
    live.prefix !== 'pettly:dev' ||
    live.local !== 'true' ||
    live.smtp !== 'mailpit'
  )
    throw Error('Live Docker API does not match the local Pettly demo target.');
  const identity =
    await db.$queryRaw`SELECT current_database() AS database, current_user AS username, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser`;
  if (
    identity[0].database !== 'pettly_db' ||
    identity[0].username !== 'pettly_dev' ||
    identity[0].superuser
  )
    throw Error('Unexpected PostgreSQL identity.');
  const schema = await readFile('apps/api/prisma/schema.prisma', 'utf8');
  const expected = [...schema.matchAll(/@@map\("([a-z_]+)"\)/g)]
    .map((m) => m[1])
    .sort();
  const actual = (
    await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`
  )
    .map((r) => r.tablename)
    .sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual))
    throw Error(
      'Schema differs from the expected Pettly table allowlist. Apply migrations before resetting.',
    );
  const hashes = await Promise.all(
    SEED_ACCOUNTS.map(() =>
      argon.hash(SEED_PASSWORD, {
        type: argon.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
    ),
  );
  compose(['stop', 'api', 'worker']);
  stopped = true;
  const backup = resolve(`backups/before-demo-${Date.now()}.enc`);
  execFileSync(
    process.execPath,
    [
      'scripts/ops/backup.mjs',
      'create',
      '--file',
      backup,
      '--container',
      'global_postgres',
      '--database',
      'pettly_db',
      '--user',
      'pettly_dev',
    ],
    {
      env: {
        ...process.env,
        PETTLY_DB_PASSWORD: decodeURIComponent(target.password),
        PETTLY_DB_CONTAINER: 'global_postgres',
        PETTLY_DB_NAME: 'pettly_db',
        PETTLY_DB_USER: 'pettly_dev',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  console.log(`Encrypted pre-reset backup: ${backup}`);
  await db.$transaction(
    async (tx) => {
      // No CASCADE, DROP, schema replacement, migration erasure or disabled constraints.
      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE ${expected.map((t) => `public."${t}"`).join(', ')}`,
      );
      for (let i = 0; i < SEED_ACCOUNTS.length; i++) {
        const account = SEED_ACCOUNTS[i],
          id = randomUUID();
        await tx.user.create({
          data: {
            id,
            email: account.email,
            name: account.name,
            lastName: 'Pruebas Pettly',
            dateOfBirth: new Date('1994-05-12T00:00:00Z'),
            phone: '+573001234567',
            address: 'Calle Demo 123',
            countryCode: 'CO',
            region: 'Bogotá D.C.',
            city: 'Bogotá',
            postalCode: '110111',
            emailVerifiedAt: account.key === 'unverified' ? null : new Date(),
            credential: { create: { passwordHash: hashes[i] } },
          },
        });
        manifest.accounts[account.key] = {
          id,
          email: account.email,
          globalRole: account.role,
        };
      }
    },
    { timeout: 30000 },
  );
  const bootstrap = execFileSync(
    process.execPath,
    [
      'apps/api/dist/main.js',
      '--bootstrap-super-admin',
      'superadmin@pettly.test',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (!bootstrap.toString().includes('super_admin_bootstrapped'))
    throw Error('Administrator bootstrap failed.');
  compose(['start', 'api']);
  await ready();
  const admin = await actor('superadmin');
  for (const key of ['superadmin.backup', 'moderator'])
    await call(admin, 'PATCH', `/users/${manifest.accounts[key].id}/role`, {
      role: manifest.accounts[key].globalRole,
      reason,
    });
  const reviewer = await actor('moderator');
  await call(admin, 'PATCH', `/users/${manifest.accounts.disabled.id}/status`, {
    status: 'disabled',
    reason,
  });
  const invited = await call(admin, 'POST', '/users', {
    email: 'invited@pettly.test',
    name: 'Paula',
    lastName: 'Invitada Pettly',
    reason,
  });

  manifest.accounts.invited = {
    id: invited.id,
    email: invited.email,
    globalRole: 'user',
    invitationPending: true,
  };

  let orgNumber = 0;
  async function organization(key, name, type, responsible, status = 'active') {
    const applicant =
      status === 'pending' || status === 'rejected'
        ? await actor('applicant')
        : null;
    let o = await call(
      applicant || admin,
      'POST',
      applicant ? '/organizations/requests' : '/organizations',
      {
        name,
        type,
        ...(applicant ? {} : { reason }),
        profile: {
          legalName: name + ' Demo',
          registrationNumber: String(990000000 + ++orgNumber),
          description: 'Organización ficticia para pruebas manuales de Pettly.',
          email: `org${orgNumber}@pettly.test`,
          phone: '+573001234567',
          countryCode: 'CO',
          region: 'Bogotá D.C.',
          city: 'Bogotá',
          address: 'Calle Demo 123',
        },
      },
    );
    if (status !== 'draft')
      o = await call(
        applicant || admin,
        'POST',
        `/organizations/${o.id}/submit`,
        { expectedVersion: o.version, reason },
      );
    if (status === 'active' || status === 'suspended')
      o = await call(admin, 'POST', `/organizations/${o.id}/approve`, {
        expectedVersion: o.version,
        reason,
        responsibleUserId: manifest.accounts[responsible].id,
      });
    if (status === 'suspended')
      o = await call(admin, 'PATCH', `/organizations/${o.id}/status`, {
        status,
        expectedVersion: o.version,
        reason,
      });
    if (status === 'rejected')
      o = await call(admin, 'POST', `/organizations/${o.id}/reject`, {
        expectedVersion: o.version,
        reason,
      });
    manifest.organizations[key] = o;
    return o;
  }
  const business = await organization(
    'business',
    'Demo Mascotas Bogotá',
    'business',
    'business.admin',
  );
  const other = await organization(
    'other',
    'Demo Mascotas Medellín',
    'business',
    'business.other',
  );
  const shelter = await organization(
    'shelter',
    'Demo Refugio Huellas',
    'adoption_entity',
    'shelter.admin',
  );
  await organization(
    'suspended',
    'Demo Empresa Suspendida',
    'business',
    'suspended.admin',
    'suspended',
  );
  await organization(
    'pending',
    'Demo Empresa Pendiente',
    'business',
    'applicant',
    'pending',
  );
  await organization(
    'rejected',
    'Demo Refugio Rechazado',
    'adoption_entity',
    'applicant',
    'rejected',
  );
  await organization(
    'draft',
    'Demo Empresa Borrador',
    'business',
    'applicant',
    'draft',
  );
  for (const [o, key, role] of [
    [business, 'business.operator', 'business_operator'],
    [business, 'multirole', 'business_admin'],
    [shelter, 'shelter.operator', 'adoption_operator'],
    [shelter, 'multirole', 'adoption_operator'],
    [business, 'vet.approved', 'business_operator'],
    [business, 'vet.pending', 'business_operator'],
  ])
    await call(
      admin,
      'PUT',
      `/organizations/${o.id}/members/${manifest.accounts[key].id}/role`,
      { role, reason },
    );
  const owner = await actor('business.admin'),
    shelterOwner = await actor('shelter.admin'),
    customer = await actor('customer'),
    customer2 = await actor('customer.second');
  console.log(
    'Accounts, role assignments and organization lifecycle fixtures created.',
  );

  const category = await call(admin, 'POST', '/catalog/admin/categories', {
    name: 'Demo Alimentos y Accesorios',
    slug: 'demo-alimentos-accesorios',
    reason,
  });
  const inactiveCategory = await call(
    admin,
    'POST',
    '/catalog/admin/categories',
    { name: 'Demo Categoría Inactiva', slug: 'demo-inactiva', reason },
  );
  await call(
    admin,
    'PATCH',
    `/catalog/admin/categories/${inactiveCategory.id}`,
    {
      profile: { status: 'inactive' },
      expectedVersion: inactiveCategory.version,
      reason,
    },
  );
  async function product(o, manager, name, state, sku) {
    let p = await call(manager, 'POST', '/catalog/admin/products', {
      organizationId: o.id,
      currency: 'COP',
      profile: {
        name,
        description:
          'Producto ficticio para probar catálogo, inventario y moderación.',
        brand: 'Pettly Demo',
        categoryId: category.id,
      },
      reason,
    });
    const added = await call(
      manager,
      'POST',
      `/catalog/admin/products/${p.id}/variants`,
      {
        profile: { sku, priceMinor: 4500000, attributes: { talla: 'M' } },
        expectedVersion: p.version,
        reason,
      },
    );
    p = (
      await upload(
        manager,
        `/catalog/admin/products/${p.id}/photos`,
        added.product.version,
      )
    ).product;
    if (state !== 'draft')
      p = await call(
        manager,
        'POST',
        `/catalog/admin/products/${p.id}/submit`,
        { expectedVersion: p.version, reason },
      );
    if (['published', 'rejected', 'paused'].includes(state))
      p = await call(
        reviewer,
        'POST',
        `/catalog/admin/products/${p.id}/review`,
        { expectedVersion: p.version, approved: state !== 'rejected', reason },
      );
    if (state === 'paused')
      p = await call(manager, 'POST', `/catalog/admin/products/${p.id}/pause`, {
        expectedVersion: p.version,
        reason,
      });
    const stock = await call(
      manager,
      'GET',
      `/inventory/variants/${added.variant.id}`,
    );
    await call(
      manager,
      'POST',
      `/inventory/variants/${added.variant.id}/movements`,
      {
        kind: 'receipt',
        quantity: 30,
        expectedVersion: stock.version,
        idempotencyKey: randomUUID(),
        reason,
      },
    );
    manifest.products.push({
      id: p.id,
      organizationId: o.id,
      name,
      status: p.status,
      variantId: added.variant.id,
      sku,
    });
    return { product: p, variant: added.variant };
  }
  const liveProduct = await product(
    business,
    owner,
    'Demo Alimento Adultos',
    'published',
    'DEMO-ALIMENTO',
  );
  await product(
    business,
    owner,
    'Demo Arnés Pendiente',
    'pending',
    'DEMO-ARNES',
  );
  await product(business, owner, 'Demo Cama Borrador', 'draft', 'DEMO-CAMA');
  await product(
    business,
    owner,
    'Demo Collar Rechazado',
    'rejected',
    'DEMO-COLLAR',
  );
  await product(
    business,
    owner,
    'Demo Juguete Pausado',
    'paused',
    'DEMO-JUGUETE',
  );
  await product(
    other,
    await actor('business.other'),
    'Demo Producto Empresa Ajena',
    'draft',
    'DEMO-AJENO',
  );

  async function resource(manager, name, capacity = 2) {
    return call(manager, 'POST', '/services/admin/resources', {
      organizationId: business.id,
      reason,
      profile: {
        name,
        kind: 'appointment',
        capacity,
        status: 'active',
        windows: Array.from({ length: 7 }, (_, i) => ({
          day: i + 1,
          startMinute: 480,
          endMinute: 1080,
        })),
      },
    });
  }
  const groomingResource = await resource(owner, 'Demo Agenda Peluquería');
  const serviceProfile = {
    name: 'Demo Baño y Peluquería',
    description: 'Servicio ficticio para probar disponibilidad y reservas.',
    category: 'grooming',
    kind: 'appointment',
    priceMinor: 3500000,
    currency: 'COP',
    acceptedSpecies: ['dog', 'cat'],
    requirements: 'Mascota acompañada por persona adulta.',
    terms: 'Condiciones de prueba. Pago presencial en la empresa.',
    collectionMode: 'pay_at_business',
    confirmationMode: 'manual',
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 15,
    checkInMinute: null,
    checkOutMinute: null,
    minNights: 1,
    maxNights: 1,
    minimumNoticeMinutes: 15,
    cancellationCutoffMinutes: 60,
    requestTtlMinutes: 1440,
    resourceIds: [groomingResource.id],
    veterinaryCredentialId: null,
  };
  async function service(profile, state = 'published') {
    let s = await call(owner, 'POST', '/services/admin', {
      organizationId: business.id,
      profile,
      reason,
    });
    if (state !== 'draft')
      s = await call(owner, 'POST', `/services/admin/${s.id}/submit`, {
        expectedVersion: s.version,
        reason,
      });
    if (state === 'published')
      s = await call(reviewer, 'POST', `/services/admin/${s.id}/review`, {
        approved: true,
        expectedVersion: s.version,
        reason,
      });
    manifest.services.push({
      id: s.id,
      name: s.name,
      status: s.status,
      resourceIds: profile.resourceIds,
    });
    return s;
  }
  const grooming = await service(serviceProfile);
  await service(
    {
      ...serviceProfile,
      name: 'Demo Adiestramiento Pendiente',
      category: 'training',
    },
    'pending',
  );
  await service(
    { ...serviceProfile, name: 'Demo Guardería Borrador', category: 'daycare' },
    'draft',
  );
  for (const [key, state, number] of [
    ['vet.approved', 'approved', '990000001'],
    ['vet.pending', 'pending', '990000002'],
  ]) {
    const professional = await actor(key),
      agenda = await resource(owner, `Demo Consulta ${key}`, 1);
    let c = await call(professional, 'POST', '/veterinary/credentials', {
      organizationId: business.id,
      professionalId: professional.id,
      resourceId: agenda.id,
      profile: {
        profession: 'veterinarian',
        registrationNumber: number,
        university: 'Universidad Ficticia de Pruebas',
        consent: true,
      },
      reason,
    });
    for (const kind of [
      'professional_card',
      'qualification',
      'standing_certificate',
    ])
      c = await upload(
        professional,
        `/veterinary/credentials/${c.id}/documents`,
        c.version,
        kind,
      );
    c = await call(
      professional,
      'POST',
      `/veterinary/credentials/${c.id}/submit`,
      { expectedVersion: c.version, reason },
    );
    if (state === 'approved') {
      c = await call(admin, 'POST', `/veterinary/credentials/${c.id}/review`, {
        approved: true,
        expectedVersion: c.version,
        officialRegisterChecked: true,
        verificationReference:
          'DEMO ONLY - synthetic fixture; no real official register check',
        verifiedUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        reason,
      });
      await service({
        ...serviceProfile,
        name: 'Demo Consulta Veterinaria',
        category: 'veterinary',
        resourceIds: [agenda.id],
        veterinaryCredentialId: c.id,
      });
    }
    manifest.credentials.push({
      id: c.id,
      professional: key,
      status: c.status,
    });
  }
  const pet = await call(customer, 'POST', '/animals', {
    profile: { name: 'Demo Mascota Cliente', species: 'dog' },
    reason,
  });
  const day = new Date(Date.now() + 3 * 86400000 - 5 * 3600000)
    .toISOString()
    .slice(0, 10);
  const availability = await call(
    null,
    'GET',
    `/services/${grooming.id}/availability?resourceId=${groomingResource.id}&from=${day}&to=${day}`,
  );
  const slots = [];
  for (const candidate of availability.slots) {
    if (
      !slots.length ||
      Date.parse(candidate.startsAt) >=
        Date.parse(slots.at(-1).startsAt) + 75 * 60000
    )
      slots.push(candidate);
  }
  if (slots.length < 4) throw Error('Demo calendar has insufficient slots.');
  for (const [i, status] of [
    'requested',
    'confirmed',
    'rejected',
    'cancelled',
  ].entries()) {
    let b = await call(customer, 'POST', '/bookings', {
      serviceId: grooming.id,
      animalId: pet.id,
      idempotencyKey: randomUUID(),
      resourceId: groomingResource.id,
      expectedServiceVersion: grooming.version,
      expectedResourceVersion: groomingResource.version,
      expectedTotalMinor: grooming.priceMinor,
      slot: { kind: 'appointment', startsAt: slots[i].startsAt },
      contact: { name: 'Carlos Pruebas Pettly', phone: '+573001234567' },
      consent: true,
    });
    if (status !== 'requested')
      b = await call(
        owner,
        'POST',
        `/bookings/admin/${b.id}/${status === 'confirmed' ? 'confirm' : status === 'rejected' ? 'reject' : 'cancel'}`,
        { expectedVersion: b.version, reason },
      );
    manifest.bookings.push({
      id: b.id,
      status: b.status,
      startsAt: b.startsAt,
    });
  }
  console.log(
    'Catalog, stock, service calendars, veterinary and booking fixtures created.',
  );

  async function publication(name, state) {
    const a = await call(shelterOwner, 'POST', '/animals', {
      organizationId: shelter.id,
      profile: {
        name,
        species: 'dog',
        sex: 'female',
        size: 'medium',
        vaccinated: null,
        neutered: null,
        description: 'Animal ficticio del refugio para pruebas.',
      },
      reason,
    });
    await upload(shelterOwner, `/animals/${a.id}/photos`, a.version);
    manifest.animals.push({ id: a.id, name, organizationId: shelter.id });
    let p = await call(shelterOwner, 'POST', '/adoptions/publications', {
      animalId: a.id,
      profile: {
        title: `${name} busca hogar`,
        description:
          'Publicación ficticia para probar una adopción responsable.',
        conditions: 'Hogar seguro y seguimiento del refugio de pruebas.',
        countryCode: 'CO',
        city: 'Bogotá',
      },
      reason,
    });
    if (state !== 'draft')
      p = await call(
        shelterOwner,
        'POST',
        `/adoptions/publications/${p.id}/submit`,
        { expectedVersion: p.version, reason },
      );
    if (state === 'published')
      p = await call(
        reviewer,
        'POST',
        `/adoptions/publications/${p.id}/review`,
        { approved: true, expectedVersion: p.version, reason },
      );
    manifest.publications.push({
      id: p.id,
      title: p.title,
      status: p.status,
      animalId: a.id,
    });
    return p;
  }
  const nala = await publication('Demo Nala', 'published');
  await publication('Demo Luna', 'pending');
  await publication('Demo Kira', 'draft');
  for (const [applicant, state] of [
    [customer, 'approved'],
    [customer2, 'in_review'],
  ]) {
    let r = await call(
      applicant,
      'POST',
      `/adoptions/publications/${nala.id}/requests`,
      {
        message: 'Solicitud ficticia: tengo un hogar seguro y deseo adoptar.',
        consent: true,
        expectedPublicationVersion: nala.version,
      },
    );
    r = await call(
      shelterOwner,
      'PATCH',
      `/adoptions/requests/${r.id}/review`,
      { status: 'in_review', expectedVersion: r.version, reason },
    );
    if (state === 'approved')
      r = await call(
        shelterOwner,
        'PATCH',
        `/adoptions/requests/${r.id}/review`,
        { status: state, expectedVersion: r.version, reason },
      );
    manifest.adoptionRequests.push({
      id: r.id,
      status: r.status,
      publicationId: nala.id,
    });
  }

  const contact = {
    recipient: 'Carlos Pruebas Pettly',
    phone: '+573001234567',
    countryCode: 'CO',
    city: 'Bogotá',
    address: 'Calle Demo 123',
    addressLine2: null,
    postalCode: '110111',
  };
  await call(owner, 'PUT', `/organizations/${business.id}/order-policy`, {
    expectedVersion: 0,
    reason,
    currency: 'COP',
    enabled: true,
    pickupAddress: { ...contact, recipient: 'Demo Mascotas Bogotá' },
    shippingRules: [{ countryCode: 'CO', city: 'Bogotá', feeMinor: 800000 }],
    taxMode: 'included',
    taxRates: {},
    shippingTaxBasisPoints: 0,
    collector: 'platform',
    terms: 'Política ficticia para pruebas; no se realizan cobros reales.',
  });
  for (const fulfillment of ['delivery', 'pickup']) {
    let cart = await call(customer, 'GET', '/cart');
    cart = await call(
      customer,
      'PUT',
      `/cart/items/${liveProduct.variant.id}`,
      { quantity: 1, expectedVersion: cart.version },
    );
    const quote = await call(customer, 'POST', '/checkout/quotes', {
      expectedCartVersion: cart.version,
      fulfillment,
      contact,
    });
    const order = await call(customer, 'POST', '/orders', {
      quoteId: quote.id,
      expectedTotalMinor: quote.snapshot.totalMinor,
      consent: true,
      idempotencyKey: randomUUID(),
    });
    manifest.orders.push({
      id: order.id,
      status: order.status,
      fulfillment,
      expiresAt: order.expiresAt,
    });
    const payment = await call(
      customer,
      'POST',
      `/orders/${order.id}/payment-attempts`,
      { idempotencyKey: randomUUID() },
    );
    manifest.payments.push({
      id: payment.id,
      status: payment.status,
      orderId: order.id,
    });
  }
  console.log(
    'Adoptions, requests, commercial policy, unpaid orders and payment attempts created.',
  );

  // Explicit synthetic failure for the superadmin recovery screen; no SMTP
  // outage or Redis mutation is injected into the shared development services.
  const notification = await db.inboxNotification.findFirstOrThrow({
    where: { userId: owner.id, category: 'organizations' },
  });
  const failedDelivery = await db.outboxMessage.create({
    data: {
      id: randomUUID(),
      notificationId: notification.id,
      subjectType: notification.subjectType,
      subjectId: notification.subjectId,
      subjectVersion: notification.subjectVersion,
      mailPurpose: 'business_notice',
      failedAt: new Date(),
      failureKind: 'delivery_failed',
      expiresAt: new Date(Date.now() + 48 * 3600000),
      attempts: 5,
    },
  });
  manifest.failedDeliveryId = failedDelivery.id;

  // Assert current server-side authority for every usable identity, not just stored labels.
  for (const account of SEED_ACCOUNTS.filter(
    (a) => !['disabled', 'unverified'].includes(a.key),
  )) {
    const a = await actor(account.key);
    const me = await call(a, 'GET', '/users/me');
    if (
      me.globalRole !== account.role ||
      me.status !== 'active' ||
      !me.emailVerifiedAt
    )
      throw Error(`Unexpected identity ${account.key}`);
    const access = await call(a, 'GET', '/authorization/me');
    if (access.globalRole !== account.role)
      throw Error(`Unexpected authority ${account.key}`);
    const expectedRoles = {
      'business.admin': ['business_admin'],
      'business.operator': ['business_operator'],
      'business.other': ['business_admin'],
      'shelter.admin': ['adoption_admin'],
      'shelter.operator': ['adoption_operator'],
      multirole: ['adoption_operator', 'business_admin'],
      'vet.approved': ['business_operator'],
      'vet.pending': ['business_operator'],
      'suspended.admin': ['business_admin'],
    };
    if (
      JSON.stringify(access.organizations.map((o) => o.role).sort()) !==
      JSON.stringify(expectedRoles[account.key] || [])
    )
      throw Error(`Unexpected memberships ${account.key}`);
    if (
      account.key === 'suspended.admin' &&
      access.organizations.some((o) =>
        o.permissions.some((p) =>
          [
            'payments.business.read',
            'orders.settings.manage',
            'catalog.manage',
            'inventory.manage',
            'orders.fulfillment.manage',
            'services.manage',
            'bookings.manage',
          ].includes(p),
        ),
      )
    )
      throw Error(
        'Unexpected operational permissions on a suspended business.',
      );
    manifest.accounts[account.key].access = access;
  }
  const foreign = await fetch(
    apiUrl + `/catalog/admin/products?organizationId=${business.id}`,
    {
      headers: {
        Authorization: `Bearer ${(await actor('business.other')).token}`,
      },
    },
  );
  if (foreign.status !== 403)
    throw Error('Foreign organization isolation failed.');
  const forbidden = await fetch(apiUrl + '/users', {
    headers: {
      Authorization: `Bearer ${(await actor('business.operator')).token}`,
    },
  });
  if (forbidden.status !== 403)
    throw Error('Scoped operator user-administration isolation failed.');
  for (const [key, status] of [
    ['superadmin', 200],
    ['disabled', 401],
    ['unverified', 403],
  ]) {
    const response = await fetch(apiUrl + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${key}@pettly.test`,
        password: SEED_PASSWORD,
        client: 'mobile',
      }),
    });
    if (response.status !== status)
      throw Error(`Unexpected login result for ${key}: ${response.status}`);
    if (response.ok) {
      const value = await response.json();
      sessions.push(value.sessionId);
    }
  }
  manifest.backup = backup;
  await writeFile(
    'tmp/demo-seed-manifest.json',
    JSON.stringify(manifest, null, 2) + '\n',
    { mode: 0o600 },
  );
  console.log(
    `Demo verified: ${SEED_ACCOUNTS.length + 1} accounts, ${Object.keys(manifest.organizations).length} organizations. Guide: docs/seeds.md; IDs: tmp/demo-seed-manifest.json`,
  );
} catch (error) {
  // Dependency errors can contain connection strings; expose only controlled seed errors.
  if (
    error instanceof Error &&
    (error.message.startsWith('Unexpected') ||
      error.message.startsWith('GET ') ||
      error.message.startsWith('POST ') ||
      error.message.startsWith('PATCH ') ||
      error.message.startsWith('PUT ') ||
      error.message.startsWith('Demo ') ||
      error.message.startsWith('Schema ') ||
      error.message.startsWith('Live ') ||
      error.message.startsWith('Local ') ||
      error.message.startsWith('Foreign ') ||
      error.message.startsWith('Scoped '))
  )
    console.error(error.message);
  else
    console.error(
      'Demo seed failed. Check local configuration, dependencies and available infrastructure. A completed reset can be repeated with the documented command.',
    );
  process.exitCode = 1;
} finally {
  try {
    if (sessions.length)
      await db.session.updateMany({
        where: { id: { in: sessions }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
  } finally {
    await db.$disconnect();
    if (stopped) compose(['start', 'api', 'worker']);
    if (locked) await unlink('tmp/demo-seed.lock');
  }
}
