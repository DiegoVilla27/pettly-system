import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client'),
  Redis = require('ioredis').default;
const db = new PrismaClient(),
  redis = new Redis(process.env.REDIS_URL);
const base = process.env.API_TEST_URL,
  mail = process.env.MAILPIT_TEST_URL;
async function request(path, body, headers = {}, method = 'POST') {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
}
async function resetRate() {
  const keys = await redis.keys(`${process.env.REDIS_PREFIX}:rate:*`);
  if (keys.length) await redis.del(...keys);
}
async function emailToken(to, purpose) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const list = await (await fetch(mail + '/api/v1/messages')).json();
    const entry = list.messages?.find(
      (m) =>
        m.To.some((t) => t.Address === to) &&
        m.Subject.includes(
          {
            verification: 'Verify',
            reset: 'Reset',
            invitation: 'Accept your invitation',
            email_change: 'Confirm your email change',
          }[purpose],
        ),
    );
    if (entry) {
      const detail = await (
        await fetch(mail + '/api/v1/message/' + entry.ID)
      ).json();
      const token = detail.Text.match(/token=([A-Za-z0-9_-]{43})/)?.[1];
      if (token) return token;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Transactional email did not arrive.');
}
const password = 'A sufficiently long password!',
  email = 'alex@example.com';
const login = async () => {
  await resetRate();
  const result = await request('/auth/login', {
    email,
    password,
    client: 'mobile',
  });
  assert.equal(result.status, 200);
  return result.body;
};
const bearer = (token) => ({ Authorization: 'Bearer ' + token });
test('identity, sessions, email, concurrency, HTTP contracts and rate limiting against real infrastructure', async (t) => {
  try {
    await t.test(
      'registration rolls back identity and credentials when its outbox write fails',
      async () => {
        await db.$executeRawUnsafe(
          `CREATE FUNCTION reject_test_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated outbox failure'; END $$`,
        );
        await db.$executeRawUnsafe(
          `CREATE TRIGGER reject_test_outbox BEFORE INSERT ON notification_outbox FOR EACH ROW EXECUTE FUNCTION reject_test_outbox()`,
        );
        try {
          assert.equal(
            (
              await request('/auth/register', {
                email: 'rollback@example.com',
                name: 'Rollback',
                lastName: 'Test',
                password,
              })
            ).status,
            500,
          );
          assert.equal(
            await db.user.count({ where: { email: 'rollback@example.com' } }),
            0,
          );
          assert.equal(await db.credential.count(), 0);
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_test_outbox ON notification_outbox',
          );
          await db.$executeRawUnsafe('DROP FUNCTION reject_test_outbox()');
          await resetRate();
        }
      },
    );
    await t.test(
      'registration persists only hashes and a durable encrypted outbox',
      async () => {
        assert.equal(
          (
            await request('/auth/register', {
              email,
              name: 'Alex',
              lastName: 'Rivera',
              password,
            })
          ).status,
          202,
        );
        const row = await db.user.findUnique({
          where: { email },
          include: { credential: true },
        });
        assert.ok(row.credential.passwordHash.startsWith('$argon2id$'));
        assert.equal(row.emailVerifiedAt, null);
        const token = await db.actionToken.findFirst();
        assert.match(token.hash, /^[a-f0-9]{64}$/);
        const duplicate = await request('/auth/register', {
          email: 'ALEX@example.com',
          name: 'Other',
          lastName: 'Rivera',
          password,
        });
        assert.equal(duplicate.status, 409);
      },
    );
    await t.test(
      'unverified users cannot sign in and verification is single-use',
      async () => {
        assert.equal(
          (await request('/auth/login', { email, password, client: 'mobile' }))
            .status,
          403,
        );
        const previous = await emailToken(email, 'verification');
        assert.equal(
          (await request('/auth/resend-verification', { email })).status,
          202,
        );
        assert.equal(
          (await request('/auth/verify-email', { token: previous })).status,
          400,
        );
        const deadline = Date.now() + 20000;
        let token = previous;
        while (token === previous && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          token = await emailToken(email, 'verification');
        }
        assert.notEqual(token, previous);
        assert.equal(
          (await request('/auth/verify-email', { token })).status,
          200,
        );
        assert.equal(
          (await request('/auth/verify-email', { token })).status,
          400,
        );
      },
    );
    await t.test(
      'profile response excludes credentials and accepts profile updates',
      async () => {
        const session = await login();
        const result = await request(
          '/users/me',
          undefined,
          bearer(session.accessToken),
          'GET',
        );
        assert.equal(result.status, 200);
        assert.deepEqual(
          Object.keys(result.body).sort(),
          [
            'id',
            'email',
            'name',
            'lastName',
            'dateOfBirth',
            'age',
            'phone',
            'address',
            'addressLine2',
            'countryCode',
            'region',
            'city',
            'postalCode',
            'globalRole',
            'status',
            'emailVerifiedAt',
            'deletedAt',
            'createdAt',
            'updatedAt',
          ].sort(),
        );
        assert.equal(
          (
            await request(
              '/users/me',
              { name: 'Alex Updated' },
              bearer(session.accessToken),
              'PATCH',
            )
          ).body.name,
          'Alex Updated',
        );
        assert.equal(
          (
            await request(
              '/users/me',
              { password },
              bearer(session.accessToken),
              'PATCH',
            )
          ).status,
          400,
        );
        assert.equal(
          (await request('/users/me', undefined, {}, 'GET')).status,
          401,
        );
      },
    );
    await t.test(
      'profile validates real names, birth dates, contacts and strict request contracts',
      async () => {
        const session = await login();
        const headers = bearer(session.accessToken);
        const fields = {
          name: 'Álex',
          lastName: 'O’Connor Rivera',
          dateOfBirth: '1995-06-15',
          phone: '+34612345678',
          address: 'Calle Mayor 10',
          addressLine2: '2B',
          countryCode: 'ES',
          region: 'Madrid',
          city: 'Madrid',
          postalCode: '02801',
        };
        const result = await request('/users/me', fields, headers, 'PATCH');
        assert.equal(result.status, 200);
        for (const [field, value] of Object.entries(fields))
          assert.equal(result.body[field], value);
        const today = new Date();
        let age = today.getUTCFullYear() - 1995;
        if (
          today.getUTCMonth() < 5 ||
          (today.getUTCMonth() === 5 && today.getUTCDate() < 15)
        )
          age--;
        assert.equal(result.body.age, age);
        for (const invalid of [
          { name: '1234' },
          { lastName: null },
          { dateOfBirth: '2026-02-30' },
          { dateOfBirth: '2999-01-01' },
          { dateOfBirth: '1800-01-01' },
          { phone: '612345678' },
          { countryCode: 'ZZ' },
          { countryCode: 'es' },
          { age: 30 },
          { globalRole: 'super_admin' },
          { status: 'disabled' },
          {},
          { city: '   ' },
        ]) {
          const response = await request(
            '/users/me',
            invalid,
            headers,
            'PATCH',
          );
          assert.equal(response.status, 400, JSON.stringify(invalid));
          assert.equal(response.body.code, 'INVALID_INPUT');
          assert.ok(response.body.details?.length);
        }
        const cleared = await request(
          '/users/me',
          { phone: null, dateOfBirth: null, addressLine2: null },
          headers,
          'PATCH',
        );
        assert.equal(cleared.status, 200);
        assert.equal(cleared.body.phone, null);
        assert.equal(cleared.body.age, null);
        assert.equal(cleared.body.city, 'Madrid');
        // Simulate malformed persisted data to prove response validation actually runs.
        await db.user.update({ where: { email }, data: { lastName: '1234' } });
        try {
          const invalidResponse = await request(
            '/users/me',
            undefined,
            headers,
            'GET',
          );
          assert.equal(invalidResponse.status, 500);
          assert.equal(invalidResponse.body.code, 'INTERNAL_ERROR');
          assert.equal(invalidResponse.body.lastName, undefined);
        } finally {
          await db.user.update({
            where: { email },
            data: { lastName: fields.lastName },
          });
        }

        await resetRate();
      },
    );
    await t.test(
      'super administrator bootstrap, authorization, atomic audit and session revocation',
      async () => {
        await resetRate();
        const emailAdmin = 'admin@example.com';
        assert.equal(
          (
            await request('/auth/register', {
              email: emailAdmin,
              name: 'Admin',
              lastName: 'Rivera',
              password,
              globalRole: 'super_admin',
            })
          ).status,
          400,
        );
        assert.equal(await db.user.count({ where: { email: emailAdmin } }), 0);
        assert.equal(
          (
            await request('/auth/register', {
              email: emailAdmin,
              name: 'Admin',
              lastName: 'Rivera',
              password,
            })
          ).status,
          202,
        );
        const raw = await emailToken(emailAdmin, 'verification');
        const invokeBootstrap = () =>
          new Promise((resolve, reject) => {
            const child = spawn(
              'pnpm',
              ['users:bootstrap-super-admin', '--email', emailAdmin],
              {
                env: {
                  ...process.env,
                  NX_DAEMON: 'false',
                  NX_ISOLATE_PLUGINS: 'false',
                },
                stdio: ['ignore', 'pipe', 'pipe'],
                timeout: 30000,
              },
            );
            let stdout = '',
              stderr = '';
            child.stdout.on('data', (chunk) => {
              stdout += chunk;
            });
            child.stderr.on('data', (chunk) => {
              stderr += chunk;
            });
            child.once('error', reject);
            child.once('close', (status) =>
              resolve({ status, stdout, stderr }),
            );
          });
        assert.notEqual(
          (await invokeBootstrap()).status,
          0,
          'An unverified account cannot become super administrator.',
        );
        assert.equal(
          (await request('/auth/verify-email', { token: raw })).status,
          200,
        );
        const bootstrap = await invokeBootstrap();
        assert.equal(bootstrap.status, 0, bootstrap.stderr + bootstrap.stdout);
        assert.notEqual(
          (await invokeBootstrap()).status,
          0,
          'Bootstrap cannot be repeated.',
        );
        await resetRate();
        const admin = await request('/auth/login', {
          email: emailAdmin,
          password,
          client: 'mobile',
        });
        assert.equal(admin.status, 200);
        const adminHeaders = bearer(admin.body.accessToken);
        const user = await db.user.findUnique({ where: { email } });
        const adminUser = await db.user.findUnique({
          where: { email: emailAdmin },
        });
        assert.equal(adminUser.globalRole, 'super_admin');
        const userSession = await login();
        const path = `/users/${user.id}/status`;
        const body = {
          status: 'disabled',
          reason: 'Confirmed repeated abuse during account review.',
        };
        assert.equal((await request(path, body, {}, 'PATCH')).status, 401);
        assert.equal(
          (await request(path, body, bearer(userSession.accessToken), 'PATCH'))
            .status,
          403,
        );
        assert.equal(
          (
            await request(
              '/users/not-a-uuid/status',
              body,
              adminHeaders,
              'PATCH',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              path,
              { ...body, reason: 'short' },
              adminHeaders,
              'PATCH',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/users/${randomUUID()}/status`,
              body,
              adminHeaders,
              'PATCH',
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await request(
              `/users/${adminUser.id}/status`,
              body,
              adminHeaders,
              'PATCH',
            )
          ).status,
          409,
        );
        await db.$executeRawUnsafe(
          `CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated audit failure'; END $$`,
        );
        await db.$executeRawUnsafe(
          `CREATE TRIGGER reject_test_audit BEFORE INSERT ON user_audit_entries FOR EACH ROW EXECUTE FUNCTION reject_test_audit()`,
        );
        try {
          assert.equal(
            (await request(path, body, adminHeaders, 'PATCH')).status,
            500,
          );
          assert.equal(
            (await db.user.findUnique({ where: { id: user.id } })).status,
            'active',
          );
          assert.equal(
            (
              await request(
                '/users/me',
                undefined,
                bearer(userSession.accessToken),
                'GET',
              )
            ).status,
            200,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_test_audit ON user_audit_entries',
          );
          await db.$executeRawUnsafe('DROP FUNCTION reject_test_audit()');
        }
        const disabled = await request(path, body, adminHeaders, 'PATCH');
        assert.equal(disabled.status, 200);
        assert.deepEqual(Object.keys(disabled.body).sort(), [
          'id',
          'status',
          'updatedAt',
        ]);
        const audit = await db.userAuditEntry.findFirst({
          where: { targetId: user.id, action: 'user.status_changed' },
        });
        assert.equal(audit.actorId, adminUser.id);
        assert.equal(audit.reason, body.reason);
        assert.equal(audit.requestId, disabled.headers.get('x-request-id'));
        assert.equal(
          (
            await request(
              '/users/me',
              undefined,
              bearer(userSession.accessToken),
              'GET',
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await request('/auth/refresh', {
              refreshToken: userSession.refreshToken,
            })
          ).status,
          400,
        );
        await resetRate();
        assert.equal(
          (await request('/auth/login', { email, password, client: 'mobile' }))
            .status,
          401,
        );
        assert.equal(
          (await request(path, body, adminHeaders, 'PATCH')).status,
          200,
        );
        assert.equal(
          await db.userAuditEntry.count({ where: { targetId: user.id } }),
          1,
        );
        assert.equal(
          (
            await request(
              path,
              {
                status: 'active',
                reason: 'Account reactivated after completing review.',
              },
              adminHeaders,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              '/users/me',
              undefined,
              bearer(userSession.accessToken),
              'GET',
            )
          ).status,
          401,
        );
        await login();
        await assert.rejects(
          db.userAuditEntry.update({
            where: { id: audit.id },
            data: { reason: 'Attempt to rewrite an audit entry.' },
          }),
        );
        // Fixture setup for status concurrency; role assignment is verified separately below.
        await db.user.update({
          where: { id: user.id },
          data: { globalRole: 'super_admin' },
        });
        const secondAdmin = await login();
        const concurrent = await Promise.all([
          request(
            `/users/${adminUser.id}/status`,
            {
              status: 'disabled',
              reason: 'Administrative self-disable concurrency test.',
            },
            adminHeaders,
            'PATCH',
          ),
          request(
            `/users/${user.id}/status`,
            {
              status: 'disabled',
              reason: 'Administrative self-disable concurrency test.',
            },
            bearer(secondAdmin.accessToken),
            'PATCH',
          ),
        ]);
        assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
        assert.equal(
          await db.user.count({
            where: { globalRole: 'super_admin', status: 'active' },
          }),
          1,
        );
        const disabledAdminId =
          concurrent[0].status === 200 ? adminUser.id : user.id;
        const survivorHeaders =
          concurrent[0].status === 200
            ? bearer(secondAdmin.accessToken)
            : adminHeaders;
        assert.equal(
          (
            await request(
              `/users/${disabledAdminId}/status`,
              {
                status: 'active',
                reason:
                  'Restore account after administrator concurrency verification.',
              },
              survivorHeaders,
              'PATCH',
            )
          ).status,
          200,
        );
        await db.user.update({
          where: { id: user.id },
          data: { globalRole: 'user' },
        });

        await resetRate();
      },
    );
    await t.test(
      'role administration, organization isolation and immutable atomic audit',
      async () => {
        await resetRate();
        const adminAccount = await db.user.findUnique({
          where: { email: 'admin@example.com' },
        });
        const account = await db.user.findUnique({ where: { email } });
        const authenticateAdmin = async () => {
          await resetRate();
          const result = await request('/auth/login', {
            email: 'admin@example.com',
            password,
            client: 'mobile',
          });
          assert.equal(result.status, 200);
          return bearer(result.body.accessToken);
        };
        let adminHeaders = await authenticateAdmin();
        let session = await login();
        let headers = bearer(session.accessToken);
        const reason = 'Role granted after reviewing the responsible account.';
        const rolePath = `/users/${account.id}/role`;
        const roles = await request(
          '/authorization/roles',
          undefined,
          headers,
          'GET',
        );
        assert.equal(roles.status, 200);
        assert.equal(roles.body.roles.length, 7);
        await resetRate();
        assert.equal(
          (
            await request('/auth/register', {
              email: 'pending-role@example.com',
              name: 'Pending',
              lastName: 'Rivera',
              password,
            })
          ).status,
          202,
        );
        const pending = await db.user.findUnique({
          where: { email: 'pending-role@example.com' },
        });
        assert.equal(pending.globalRole, 'user');
        assert.equal(
          (
            await request(
              `/users/${pending.id}/role`,
              { role: 'moderator', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          409,
        );

        assert.equal(
          (
            await request(
              `/authorization/users/${account.id}`,
              undefined,
              headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/authorization/users/${account.id}`,
              undefined,
              adminHeaders,
              'GET',
            )
          ).body.globalRole,
          'user',
        );

        assert.equal(
          (
            await request(
              rolePath,
              { role: 'moderator', reason },
              headers,
              'PATCH',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              rolePath,
              { role: 'business_admin', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/users/${adminAccount.id}/role`,
              { role: 'user', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              `/users/${randomUUID()}/role`,
              { role: 'moderator', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          404,
        );
        await db.$executeRawUnsafe(
          `CREATE FUNCTION reject_role_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated role audit failure'; END $$`,
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_role_audit BEFORE INSERT ON user_audit_entries FOR EACH ROW EXECUTE FUNCTION reject_role_audit()',
        );
        try {
          assert.equal(
            (
              await request(
                rolePath,
                { role: 'moderator', reason },
                adminHeaders,
                'PATCH',
              )
            ).status,
            500,
          );
          assert.equal(
            (await db.user.findUnique({ where: { id: account.id } }))
              .globalRole,
            'user',
          );
          assert.equal(
            (await request('/users/me', undefined, headers, 'GET')).status,
            200,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_role_audit ON user_audit_entries',
          );
          await db.$executeRawUnsafe('DROP FUNCTION reject_role_audit()');
        }
        const roleChange = await request(
          rolePath,
          { role: 'moderator', reason },
          adminHeaders,
          'PATCH',
        );
        assert.equal(roleChange.status, 200);
        assert.equal(roleChange.body.globalRole, 'moderator');
        assert.equal(
          (await request('/authorization/me', undefined, headers, 'GET'))
            .status,
          401,
        );
        assert.equal(
          (
            await request('/auth/refresh', {
              refreshToken: session.refreshToken,
            })
          ).status,
          400,
        );
        session = await login();
        headers = bearer(session.accessToken);
        const moderator = await request(
          '/authorization/me',
          undefined,
          headers,
          'GET',
        );
        assert.equal(moderator.body.globalRole, 'moderator');
        assert.ok(
          moderator.body.globalPermissions.includes(
            'moderation.publications.review',
          ),
        );
        assert.equal(
          (
            await request(
              `/users/${account.id}/status`,
              { status: 'disabled', reason },
              headers,
              'PATCH',
            )
          ).status,
          403,
        );
        const auditCount = await db.userAuditEntry.count({
          where: { targetId: account.id, action: 'user.global_role_changed' },
        });
        assert.equal(
          (
            await request(
              rolePath,
              { role: 'moderator', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          await db.userAuditEntry.count({
            where: { targetId: account.id, action: 'user.global_role_changed' },
          }),
          auditCount,
        );
        assert.equal(
          (
            await request(
              rolePath,
              { role: 'user', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          200,
        );
        session = await login();
        headers = bearer(session.accessToken);
        assert.equal(
          (await request('/authorization/me', undefined, headers, 'GET')).body
            .globalRole,
          'user',
        );
        // Organization creation must roll back if durable audit fails.
        await db.$executeRawUnsafe(
          `CREATE FUNCTION reject_org_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated organization audit failure'; END $$`,
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_org_audit BEFORE INSERT ON organization_audit_entries FOR EACH ROW EXECUTE FUNCTION reject_org_audit()',
        );
        try {
          assert.equal(
            (
              await request(
                '/organizations',
                { name: 'Rollback Company', type: 'business', reason },
                adminHeaders,
              )
            ).status,
            500,
          );
          assert.equal(
            await db.organization.count({
              where: { name: 'Rollback Company' },
            }),
            0,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_org_audit ON organization_audit_entries',
          );
          await db.$executeRawUnsafe('DROP FUNCTION reject_org_audit()');
        }
        assert.equal(
          (
            await request(
              '/organizations',
              { name: 'Unauthorized Company', type: 'business', reason },
              headers,
            )
          ).status,
          403,
        );
        const company = await request(
          '/organizations',
          { name: 'Company One', type: 'business', reason },
          adminHeaders,
        );
        const another = await request(
          '/organizations',
          { name: 'Company Two', type: 'business', reason },
          adminHeaders,
        );
        const shelter = await request(
          '/organizations',
          { name: 'Shelter One', type: 'adoption_entity', reason },
          adminHeaders,
        );
        for (const result of [company, another, shelter])
          assert.equal(result.status, 201);
        const memberPath = `/organizations/${company.body.id}/members/${account.id}/role`;
        const shelterPath = `/organizations/${shelter.body.id}/members/${account.id}/role`;
        assert.equal(
          (
            await request(
              memberPath,
              { role: 'adoption_admin', reason },
              adminHeaders,
              'PUT',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              shelterPath,
              { role: 'business_admin', reason },
              adminHeaders,
              'PUT',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              memberPath,
              { role: 'business_admin', reason },
              headers,
              'PUT',
            )
          ).status,
          403,
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_org_audit BEFORE INSERT ON organization_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation()',
        );
        try {
          assert.equal(
            (
              await request(
                memberPath,
                { role: 'business_admin', reason },
                adminHeaders,
                'PUT',
              )
            ).status,
            500,
          );
          assert.equal(
            await db.organizationMembership.count({
              where: { organizationId: company.body.id, userId: account.id },
            }),
            0,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_org_audit ON organization_audit_entries',
          );
        }
        assert.equal(
          (
            await request(
              `/organizations/${company.body.id}/members/${pending.id}/role`,
              { role: 'business_operator', reason },
              adminHeaders,
              'PUT',
            )
          ).status,
          409,
        );
        const assigned = await request(
          memberPath,
          { role: 'business_admin', reason },
          adminHeaders,
          'PUT',
        );
        assert.equal(assigned.status, 200);
        assert.equal(
          (
            await request(
              shelterPath,
              { role: 'adoption_operator', reason },
              adminHeaders,
              'PUT',
            )
          ).status,
          200,
        );
        for (const [organization, registrationNumber] of [
          [company, 'OLD-COMPANY'],
          [shelter, 'OLD-SHELTER'],
        ]) {
          const path = `/organizations/${organization.body.id}`;
          const profile = {
            legalName: organization.body.name,
            registrationNumber,
            email: 'contact@example.com',
            phone: '+573001234567',
            countryCode: 'CO',
            city: 'Bogota',
            address: 'Calle 10 20',
          };
          assert.equal(
            (
              await request(
                path + '/profile',
                { profile, reason, expectedVersion: 1 },
                adminHeaders,
                'PATCH',
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                path + '/submit',
                { reason, expectedVersion: 2 },
                adminHeaders,
              )
            ).status,
            201,
          );
          const approved = await request(
            path + '/approve',
            { reason, expectedVersion: 3, responsibleUserId: adminAccount.id },
            adminHeaders,
          );
          assert.equal(approved.status, 201, JSON.stringify(approved.body));
        }
        let access = await request(
          '/authorization/me',
          undefined,
          headers,
          'GET',
        );
        assert.equal(access.status, 200);
        assert.equal(access.body.globalRole, 'user');
        assert.equal(access.body.organizations.length, 2);
        assert.ok(
          access.body.organizations
            .find((o) => o.organizationId === company.body.id)
            .permissions.includes('catalog.manage'),
        );
        assert.ok(
          !access.body.organizations
            .find((o) => o.organizationId === shelter.body.id)
            .permissions.includes('catalog.manage'),
        );
        assert.equal(
          (
            await request(
              `/organizations/${company.body.id}`,
              undefined,
              headers,
              'GET',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              `/organizations/${another.body.id}`,
              undefined,
              headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              memberPath,
              { role: 'business_operator', reason },
              headers,
              'PUT',
            )
          ).status,
          403,
          'Company admin cannot assign roles.',
        );
        await assert.rejects(
          db.organizationMembership.update({
            where: { id: assigned.body.id },
            data: { role: 'adoption_admin' },
          }),
        );
        const writes = await Promise.all(
          ['business_operator', 'business_admin'].map((role) =>
            request(memberPath, { role, reason }, adminHeaders, 'PUT'),
          ),
        );
        assert.deepEqual(
          writes.map((r) => r.status),
          [200, 200],
        );
        assert.equal(
          await db.organizationMembership.count({
            where: { organizationId: company.body.id, userId: account.id },
          }),
          1,
        );
        const membershipAudit = await db.organizationAuditEntry.findFirst({
          where: {
            targetUserId: account.id,
            action: 'membership.role_assigned',
          },
        });
        assert.equal(membershipAudit.actorId, adminAccount.id);
        await assert.rejects(
          db.organizationAuditEntry.update({
            where: { id: membershipAudit.id },
            data: { reason: 'Rewrite a protected historical event.' },
          }),
        );
        assert.equal(
          (
            await request(
              `/users/${account.id}/status`,
              { status: 'disabled', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          (await request('/authorization/me', undefined, headers, 'GET'))
            .status,
          401,
        );
        assert.equal(
          (
            await request(
              `/authorization/users/${account.id}`,
              undefined,
              adminHeaders,
              'GET',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              rolePath,
              { role: 'moderator', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              `/users/${account.id}/status`,
              { status: 'active', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          200,
        );
        session = await login();
        headers = bearer(session.accessToken);
        assert.equal(
          (
            await request(
              shelterPath,
              { role: 'adoption_admin', reason },
              adminHeaders,
              'PUT',
            )
          ).status,
          200,
        );
        const removed = await request(
          memberPath,
          { reason },
          adminHeaders,
          'DELETE',
        );
        assert.equal(removed.status, 200);
        assert.equal(
          (
            await request(
              `/organizations/${company.body.id}`,
              undefined,
              headers,
              'GET',
            )
          ).status,
          403,
        );
        access = await request('/authorization/me', undefined, headers, 'GET');
        assert.equal(access.body.organizations.length, 1);
        const removes = await db.organizationAuditEntry.count({
          where: { action: 'membership.role_removed' },
        });
        assert.equal(
          (await request(memberPath, { reason }, adminHeaders, 'DELETE'))
            .status,
          200,
        );
        assert.equal(
          await db.organizationAuditEntry.count({
            where: { action: 'membership.role_removed' },
          }),
          removes,
        );
        assert.equal(
          (await request(shelterPath, { reason }, adminHeaders, 'DELETE'))
            .status,
          200,
        );
        // Grant a second superadministrator through the real endpoint, then concurrently demote both.
        assert.equal(
          (
            await request(
              rolePath,
              { role: 'super_admin', reason },
              adminHeaders,
              'PATCH',
            )
          ).status,
          200,
        );
        const second = await login();
        const secondHeaders = bearer(second.accessToken);
        const demotions = await Promise.all([
          request(
            `/users/${adminAccount.id}/role`,
            { role: 'user', reason },
            adminHeaders,
            'PATCH',
          ),
          request(rolePath, { role: 'user', reason }, secondHeaders, 'PATCH'),
        ]);
        assert.deepEqual(demotions.map((r) => r.status).sort(), [200, 409]);
        assert.equal(
          await db.user.count({
            where: {
              globalRole: 'super_admin',
              status: 'active',
              emailVerifiedAt: { not: null },
            },
          }),
          1,
        );
        if (demotions[0].status === 200) {
          assert.equal(
            (
              await request(
                `/users/${adminAccount.id}/role`,
                { role: 'super_admin', reason },
                secondHeaders,
                'PATCH',
              )
            ).status,
            200,
          );
          adminHeaders = await authenticateAdmin();
          assert.equal(
            (
              await request(
                rolePath,
                { role: 'user', reason },
                adminHeaders,
                'PATCH',
              )
            ).status,
            200,
          );
        }
        assert.equal(
          (await db.user.findUnique({ where: { id: account.id } })).globalRole,
          'user',
        );
        await resetRate();
      },
    );
    const reason =
      'Administrative operation requested during integration testing.';
    const adminLogin = async () => {
      await resetRate();
      const result = await request('/auth/login', {
        email: 'admin@example.com',
        password,
        client: 'mobile',
      });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      return result.body;
    };
    const createInvited = async (to, adminHeaders) => {
      const result = await request(
        '/users',
        { email: to, name: 'Invited', lastName: 'Rivera', reason },
        adminHeaders,
      );
      assert.equal(result.status, 202, JSON.stringify(result.body));
      return result.body;
    };
    const createAccount = async (to, adminHeaders) => {
      await resetRate();
      const account = await createInvited(to, adminHeaders);
      const token = await emailToken(to, 'invitation');
      assert.equal(
        (await request('/auth/accept-invitation', { token, password })).status,
        200,
      );
      const session = await request('/auth/login', {
        email: to,
        password,
        client: 'mobile',
      });
      assert.equal(session.status, 200);
      return {
        account,
        session: session.body,
        headers: bearer(session.body.accessToken),
      };
    };
    await t.test(
      'administrative reads, bounded search, filters and audited profile updates enforce authorization',
      async () => {
        const admin = await adminLogin(),
          headers = bearer(admin.accessToken),
          client = await login(),
          clientHeaders = bearer(client.accessToken);
        for (const path of [
          '/users',
          '/users/' + randomUUID(),
          '/users/' + randomUUID() + '/audit',
        ]) {
          assert.equal((await request(path, undefined, {}, 'GET')).status, 401);
          assert.equal(
            (await request(path, undefined, clientHeaders, 'GET')).status,
            403,
          );
        }
        assert.equal(
          (await request('/users/' + randomUUID(), undefined, headers, 'GET'))
            .status,
          404,
        );
        const target = await createInvited('search-case@example.com', headers);
        const row = await request(
          '/users?search=SEARCH-CASE&role=user&emailVerified=false&limit=1&sortBy=email&sortOrder=asc',
          undefined,
          headers,
          'GET',
        );
        assert.equal(row.status, 200);
        assert.equal(row.body.items.length, 1);
        assert.equal(row.body.total, 1);
        assert.equal(row.body.items[0].id, target.id);
        for (const query of [
          'limit=101',
          'page=0',
          'sortBy=passwordHash',
          'emailVerified=1',
          'unexpected=1',
          'limit=20&limit=30',
        ])
          assert.equal(
            (await request('/users?' + query, undefined, headers, 'GET'))
              .status,
            400,
            query,
          );
        assert.equal(
          (
            await request(
              '/users/' + target.id,
              { status: 'disabled', reason },
              headers,
              'PATCH',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              '/users/' + target.id + '/status',
              { status: 'disabled', reason },
              headers,
              'PATCH',
            )
          ).status,
          200,
        );
        const updated = await request(
          '/users/' + target.id,
          {
            profile: {
              name: 'Renée',
              city: 'Barcelona',
              phone: '+34612345678',
            },
            reason,
          },
          headers,
          'PATCH',
        );
        assert.equal(updated.status, 200);
        assert.equal(updated.body.status, 'disabled');
        assert.equal(updated.body.city, 'Barcelona');
        assert.equal(
          (
            await request(
              '/users/' + target.id,
              { profile: { email: 'forbidden@example.com' }, reason },
              headers,
              'PATCH',
            )
          ).status,
          400,
        );
        const audit = await request(
          '/users/' + target.id + '/audit?limit=1',
          undefined,
          headers,
          'GET',
        );
        assert.equal(audit.status, 200);
        assert.equal(audit.body.total, 3);
        assert.equal(audit.body.items[0].action, 'user.profile_updated');
        assert.equal(
          audit.body.items[0].requestId,
          updated.headers.get('x-request-id'),
        );
        const orgRole = await request(
          '/users?organizationRole=business_admin',
          undefined,
          headers,
          'GET',
        );
        assert.equal(orgRole.status, 200);
        assert.equal(orgRole.body.total, 1);
      },
    );
    await t.test(
      'invitation activation is single-use, role-safe and recoverable through administrator resend',
      async () => {
        const admin = await adminLogin(),
          headers = bearer(admin.accessToken),
          to = 'invitation@example.com';
        assert.equal(
          (
            await request(
              '/users',
              {
                email: to,
                name: 'Invite',
                lastName: 'Rivera',
                reason,
                password,
              },
              headers,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              '/users',
              {
                email: to,
                name: 'Invite',
                lastName: 'Rivera',
                reason,
                globalRole: 'super_admin',
              },
              headers,
            )
          ).status,
          400,
        );
        const target = await createInvited(to, headers),
          first = await emailToken(to, 'invitation');
        assert.equal(target.globalRole, 'user');
        assert.equal(target.emailVerifiedAt, null);
        assert.equal(
          await db.credential.count({ where: { userId: target.id } }),
          0,
        );
        assert.equal(
          (await request('/auth/resend-verification', { email: to })).status,
          202,
        );
        assert.equal(
          (await request('/auth/forgot-password', { email: to })).status,
          202,
        );
        assert.equal(
          await db.actionToken.count({
            where: {
              userId: target.id,
              purpose: { in: ['verification', 'reset'] },
            },
          }),
          0,
        );
        assert.equal(
          (
            await request(
              '/users/' + target.id + '/role',
              { role: 'moderator', reason },
              headers,
              'PATCH',
            )
          ).status,
          409,
        );
        const path = '/users/' + target.id + '/invitation';
        assert.equal((await request(path, { reason }, headers)).status, 200);
        assert.equal(
          (await request('/auth/accept-invitation', { token: first, password }))
            .status,
          400,
        );
        let token = first;
        const deadline = Date.now() + 20000;
        while (token === first && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 250));
          token = await emailToken(to, 'invitation');
        }
        assert.notEqual(token, first);
        const winners = await Promise.all([
          request('/auth/accept-invitation', { token, password }),
          request('/auth/accept-invitation', { token, password }),
        ]);
        assert.deepEqual(winners.map((r) => r.status).sort(), [200, 400]);
        assert.equal(
          (
            await request('/auth/login', {
              email: to,
              password,
              client: 'mobile',
            })
          ).status,
          200,
        );
        assert.equal((await request(path, { reason }, headers)).status, 409);
        assert.equal(
          (
            await request(
              '/users',
              { email: to, name: 'Duplicate', lastName: 'Rivera', reason },
              headers,
            )
          ).status,
          409,
        );
        const credential = await db.credential.findUnique({
          where: { userId: target.id },
        });
        assert.ok(credential.passwordHash.startsWith('$argon2id$'));
      },
    );
    await t.test(
      'invitation, profile and deletion changes roll back when outbox or audit persistence fails',
      async () => {
        const admin = await adminLogin(),
          headers = bearer(admin.accessToken);
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_management_outbox BEFORE INSERT ON notification_outbox FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation()',
        );
        try {
          assert.equal(
            (
              await request(
                '/users',
                {
                  email: 'failed-invite@example.com',
                  name: 'Fail',
                  lastName: 'Rivera',
                  reason,
                },
                headers,
              )
            ).status,
            500,
          );
          assert.equal(
            await db.user.count({
              where: { email: 'failed-invite@example.com' },
            }),
            0,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_management_outbox ON notification_outbox',
          );
        }
        const fixture = await createAccount(
            'rollback-management@example.com',
            headers,
          ),
          row = await db.user.findUnique({ where: { id: fixture.account.id } }),
          credential = await db.credential.findUnique({
            where: { userId: row.id },
          });
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_management_audit BEFORE INSERT ON user_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation()',
        );
        try {
          assert.equal(
            (
              await request(
                '/users',
                {
                  email: 'failed-audit-invite@example.com',
                  name: 'Fail',
                  lastName: 'Rivera',
                  reason,
                },
                headers,
              )
            ).status,
            500,
          );
          assert.equal(
            await db.user.count({
              where: { email: 'failed-audit-invite@example.com' },
            }),
            0,
          );
          assert.equal(
            (
              await request(
                '/users/' + row.id,
                { profile: { city: 'Rollback City' }, reason },
                headers,
                'PATCH',
              )
            ).status,
            500,
          );
          assert.equal(
            (await db.user.findUnique({ where: { id: row.id } })).city,
            row.city,
          );
          assert.equal(
            (await request('/users/' + row.id, { reason }, headers, 'DELETE'))
              .status,
            500,
          );
          assert.deepEqual(
            await db.user.findUnique({ where: { id: row.id } }),
            row,
          );
          assert.deepEqual(
            await db.credential.findUnique({ where: { userId: row.id } }),
            credential,
          );
          assert.equal(
            (await request('/users/me', undefined, fixture.headers, 'GET'))
              .status,
            200,
          );
          assert.ok(
            await db.refreshToken.count({
              where: { session: { userId: row.id } },
            }),
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_management_audit ON user_audit_entries',
          );
        }
      },
    );
    await t.test(
      'owned session pagination and targeted revocation never expose another account sessions',
      async () => {
        const admin = await adminLogin(),
          headers = bearer(admin.accessToken),
          fixture = await createAccount('sessions@example.com', headers);
        const next = await request('/auth/login', {
            email: fixture.account.email,
            password,
            client: 'mobile',
          }),
          active = bearer(next.body.accessToken);
        const page = await request(
          '/auth/sessions?limit=1',
          undefined,
          active,
          'GET',
        );
        assert.equal(page.status, 200);
        assert.equal(page.body.total, 2);
        assert.equal(page.body.items.length, 1);
        assert.equal(page.body.items[0].current, true);
        assert.deepEqual(Object.keys(page.body.items[0]).sort(), [
          'createdAt',
          'current',
          'expiresAt',
          'id',
        ]);
        assert.equal(
          (await request('/auth/sessions?limit=101', undefined, active, 'GET'))
            .status,
          400,
        );
        assert.equal(
          (
            await request(
              '/auth/sessions/' + admin.sessionId,
              undefined,
              active,
              'DELETE',
            )
          ).status,
          404,
        );
        const path = '/auth/sessions/' + fixture.session.sessionId;
        assert.equal(
          (await request(path, undefined, active, 'DELETE')).status,
          200,
        );
        assert.equal(
          (await request(path, undefined, active, 'DELETE')).status,
          200,
        );
        assert.equal(
          (await request('/users/me', undefined, fixture.headers, 'GET'))
            .status,
          401,
        );
        assert.equal(
          (
            await request('/auth/refresh', {
              refreshToken: fixture.session.refreshToken,
            })
          ).status,
          400,
        );
        assert.equal(
          (await request('/auth/sessions', undefined, active, 'GET')).body
            .total,
          1,
        );
        const revoked = await request(
          '/auth/sessions/' + next.body.sessionId,
          undefined,
          active,
          'DELETE',
        );
        assert.equal(revoked.status, 200);
        assert.match(revoked.headers.get('set-cookie'), /pettly_refresh=;/);
        assert.equal(
          (await request('/auth/sessions', undefined, active, 'GET')).status,
          401,
        );
      },
    );
    await t.test(
      'password changes require current credentials, invalidate email links and atomically revoke all sessions',
      async () => {
        const admin = await adminLogin(),
          headers = bearer(admin.accessToken),
          fixture = await createAccount('password-change@example.com', headers);
        const nextPassword = 'A different sufficiently long password!';
        assert.equal(
          (
            await request(
              '/auth/change-password',
              { currentPassword: 'wrong', newPassword: nextPassword },
              fixture.headers,
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await request(
              '/auth/change-password',
              { currentPassword: password, newPassword: password },
              fixture.headers,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              '/auth/change-email',
              { password, email: 'pending-password@example.com' },
              fixture.headers,
            )
          ).status,
          200,
        );
        const pending = await emailToken(
          'pending-password@example.com',
          'email_change',
        );
        assert.equal(
          (
            await request('/auth/forgot-password', {
              email: fixture.account.email,
            })
          ).status,
          202,
        );
        const reset = await emailToken(fixture.account.email, 'reset');
        const baseline = await db.credential.findUnique({
          where: { userId: fixture.account.id },
        });
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_password_notice BEFORE INSERT ON notification_outbox FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation()',
        );
        try {
          assert.equal(
            (
              await request(
                '/auth/change-password',
                { currentPassword: password, newPassword: nextPassword },
                fixture.headers,
              )
            ).status,
            500,
          );
          assert.deepEqual(
            await db.credential.findUnique({
              where: { userId: fixture.account.id },
            }),
            baseline,
          );
          assert.equal(
            (await request('/users/me', undefined, fixture.headers, 'GET'))
              .status,
            200,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_password_notice ON notification_outbox',
          );
        }
        const changed = await request(
          '/auth/change-password',
          { currentPassword: password, newPassword: nextPassword },
          fixture.headers,
        );
        assert.equal(changed.status, 200);
        assert.match(changed.headers.get('set-cookie'), /pettly_refresh=;/);
        assert.equal(
          (await request('/users/me', undefined, fixture.headers, 'GET'))
            .status,
          401,
        );
        assert.equal(
          (await request('/auth/confirm-email-change', { token: pending }))
            .status,
          400,
        );
        assert.equal(
          (await request('/auth/reset-password', { token: reset, password }))
            .status,
          400,
        );
        assert.equal(
          (
            await db.credential.findUnique({
              where: { userId: fixture.account.id },
            })
          ).pendingEmail,
          null,
        );
        await resetRate();
        assert.equal(
          (
            await request('/auth/login', {
              email: fixture.account.email,
              password,
              client: 'mobile',
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await request('/auth/login', {
              email: fixture.account.email,
              password: nextPassword,
              client: 'mobile',
            })
          ).status,
          200,
        );
      },
    );
    await t.test(
      'email confirmation verifies the new address, rolls back audit failures and revokes all sessions',
      async () => {
        const admin = await adminLogin(),
          headers = bearer(admin.accessToken),
          fixture = await createAccount('email-before@example.com', headers),
          nextEmail = 'email-after@example.com';
        assert.equal(
          (
            await request(
              '/auth/change-email',
              { password: 'wrong', email: nextEmail },
              fixture.headers,
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await request(
              '/auth/change-email',
              { password, email },
              fixture.headers,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              '/auth/change-email',
              { password, email: fixture.account.email },
              fixture.headers,
            )
          ).status,
          400,
        );
        await resetRate();
        assert.equal(
          (
            await request(
              '/auth/change-email',
              { password, email: nextEmail },
              fixture.headers,
            )
          ).status,
          200,
        );
        assert.equal(
          (await db.user.findUnique({ where: { id: fixture.account.id } }))
            .email,
          fixture.account.email,
        );
        const token = await emailToken(nextEmail, 'email_change');
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_email_audit BEFORE INSERT ON user_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation()',
        );
        try {
          assert.equal(
            (await request('/auth/confirm-email-change', { token })).status,
            500,
          );
          assert.equal(
            (await db.user.findUnique({ where: { id: fixture.account.id } }))
              .email,
            fixture.account.email,
          );
          assert.equal(
            (await request('/users/me', undefined, fixture.headers, 'GET'))
              .status,
            200,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_email_audit ON user_audit_entries',
          );
        }
        const result = await request('/auth/confirm-email-change', { token });
        assert.equal(result.status, 200);
        assert.equal(
          (await request('/auth/confirm-email-change', { token })).status,
          400,
        );
        const after = await db.user.findUnique({
          where: { id: fixture.account.id },
        });
        assert.equal(after.email, nextEmail);
        assert.ok(after.emailVerifiedAt);
        assert.equal(
          (await request('/users/me', undefined, fixture.headers, 'GET'))
            .status,
          401,
        );
        await resetRate();
        assert.equal(
          (
            await request('/auth/login', {
              email: fixture.account.email,
              password,
              client: 'mobile',
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await request('/auth/login', {
              email: nextEmail,
              password,
              client: 'mobile',
            })
          ).status,
          200,
        );
        assert.equal(
          await db.userAuditEntry.count({
            where: { targetId: after.id, action: 'user.email_changed' },
          }),
          1,
        );
      },
    );
    await t.test(
      'concurrent confirmation cannot give two accounts the same email and reset invalidates pending changes',
      async () => {
        const admin = await adminLogin(),
          headers = bearer(admin.accessToken),
          one = await createAccount('race-email-one@example.com', headers),
          two = await createAccount('race-email-two@example.com', headers),
          target = 'race-email-target@example.com';
        const requested = await request(
          '/auth/change-email',
          { password, email: target },
          one.headers,
        );
        assert.equal(requested.status, 200);
        const first = await emailToken(target, 'email_change');
        assert.equal(
          (
            await request(
              '/auth/change-email',
              { password, email: target },
              two.headers,
            )
          ).status,
          200,
        );
        const ownKeys = [one, two].map((fixture) =>
          createHash('sha256')
            .update(`${fixture.account.id}:${target}:email_change`)
            .digest('hex'),
        );
        const outboxes = await db.outboxMessage.findMany({
          where: { correlationKey: { in: ownKeys } },
        });
        assert.equal(outboxes.length, 2);
        assert.ok(
          outboxes.every((row) => !row.failedAt),
          'Different accounts must not cancel each other pending email.',
        );
        let second = first;
        const deadline = Date.now() + 20000;
        while (second === first && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 250));
          second = await emailToken(target, 'email_change');
        }
        assert.notEqual(second, first);
        const results = await Promise.all([
          request('/auth/confirm-email-change', { token: first }),
          request('/auth/confirm-email-change', { token: second }),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        assert.equal(await db.user.count({ where: { email: target } }), 1);
        const loser = results[0].status === 409 ? one : two;
        await resetRate();
        assert.equal(
          (
            await request('/auth/forgot-password', {
              email: loser.account.email,
            })
          ).status,
          202,
        );
        const reset = await emailToken(loser.account.email, 'reset');
        assert.equal(
          (
            await request('/auth/reset-password', {
              token: reset,
              password: 'Another sufficient recovery password!',
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request('/auth/confirm-email-change', {
              token: results[0].status === 409 ? first : second,
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      'administrative and self deletion anonymize identity, purge secrets and permanently deny access',
      async () => {
        const admin = await adminLogin(),
          headers = bearer(admin.accessToken),
          fixture = await createAccount('delete-admin@example.com', headers);
        assert.equal(
          (
            await request(
              '/users/' + randomUUID(),
              { reason },
              fixture.headers,
              'DELETE',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/auth/change-email',
              { password, email: 'delete-pending@example.com' },
              fixture.headers,
            )
          ).status,
          200,
        );
        const token = await emailToken(
          'delete-pending@example.com',
          'email_change',
        );
        const result = await request(
          '/users/' + fixture.account.id,
          { reason },
          headers,
          'DELETE',
        );
        assert.equal(result.status, 200);
        const after = await db.user.findUnique({
          where: { id: fixture.account.id },
        });
        assert.equal(after.status, 'deleted');
        assert.equal(after.email, `deleted.${after.id}@anonymized.invalid`);
        assert.equal(after.name, 'Deleted');
        assert.equal(after.lastName, 'Account');
        assert.ok(after.deletedAt);
        for (const key of [
          'phone',
          'city',
          'address',
          'countryCode',
          'dateOfBirth',
          'emailVerifiedAt',
        ])
          assert.equal(after[key], null);
        assert.equal(
          await db.credential.count({ where: { userId: after.id } }),
          0,
        );
        assert.equal(
          await db.actionToken.count({ where: { userId: after.id } }),
          0,
        );
        assert.equal(
          await db.refreshToken.count({
            where: { session: { userId: after.id } },
          }),
          0,
        );
        assert.equal(
          (await request('/users/me', undefined, fixture.headers, 'GET'))
            .status,
          401,
        );
        assert.equal(
          (await request('/auth/confirm-email-change', { token })).status,
          400,
        );
        assert.equal(
          (await request('/users/' + after.id, { reason }, headers, 'DELETE'))
            .status,
          200,
        );
        assert.equal(
          await db.userAuditEntry.count({
            where: { targetId: after.id, action: 'user.deleted' },
          }),
          1,
        );
        assert.equal(
          (
            await request(
              '/users/' + after.id + '/status',
              { status: 'active', reason },
              headers,
              'PATCH',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              '/users/' + after.id,
              { profile: { city: 'Madrid' }, reason },
              headers,
              'PATCH',
            )
          ).status,
          409,
        );
        const listing = await request(
          '/users?status=deleted',
          undefined,
          headers,
          'GET',
        );
        assert.equal(listing.status, 200);
        assert.ok(listing.body.items.some((u) => u.id === after.id));
        const self = await createAccount('delete-self@example.com', headers);
        assert.equal(
          (
            await request(
              '/auth/account',
              { password: 'wrong', reason },
              self.headers,
              'DELETE',
            )
          ).status,
          401,
        );
        const own = await request(
          '/auth/account',
          { password, reason },
          self.headers,
          'DELETE',
        );
        assert.equal(own.status, 200);
        assert.match(own.headers.get('set-cookie'), /pettly_refresh=;/);
        assert.equal(
          (await request('/users/me', undefined, self.headers, 'GET')).status,
          401,
        );
        assert.equal(
          (
            await request(
              '/users/' + admin.sessionId,
              { reason },
              headers,
              'DELETE',
            )
          ).status,
          404,
        );
        const adminRow = await db.user.findUnique({
          where: { email: 'admin@example.com' },
        });
        assert.equal(
          (
            await request(
              '/users/' + adminRow.id,
              { reason },
              headers,
              'DELETE',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              '/auth/account',
              { password, reason },
              headers,
              'DELETE',
            )
          ).status,
          409,
        );
      },
    );
    const organizationFixture = {};
    await t.test(
      'organization onboarding separates own applications from roles and private profiles',
      async () => {
        const admin = await adminLogin(),
          adminHeaders = bearer(admin.accessToken);
        const applicant = await createAccount(
          'org-applicant@example.com',
          adminHeaders,
        );
        const outsider = await createAccount(
          'org-outsider@example.com',
          adminHeaders,
        );
        const profile = {
          legalName: 'Integration Provider SAS',
          registrationNumber: '900.555-888',
          email: 'contact@example.com',
          phone: '+573001234567',
          countryCode: 'CO',
          city: 'Bogota',
          address: 'Calle 10 20',
        };
        for (const field of [
          { role: 'business_admin' },
          { status: 'active' },
          { responsibleUserId: applicant.account.id },
        ])
          assert.equal(
            (
              await request(
                '/organizations/requests',
                { name: 'Integration Provider', type: 'business', ...field },
                applicant.headers,
              )
            ).status,
            400,
          );
        assert.equal(
          (
            await request(
              '/organizations/requests',
              {
                name: 'Bad Provider',
                type: 'business',
                profile: { website: 'https://user:password@example.com' },
              },
              applicant.headers,
            )
          ).status,
          400,
        );
        const created = await request(
          '/organizations/requests',
          { name: 'Integration Provider', type: 'business' },
          applicant.headers,
        );
        assert.equal(created.status, 201, JSON.stringify(created.body));
        assert.equal(created.body.status, 'draft');
        assert.equal(created.body.version, 1);
        assert.equal(created.body.applicantId, applicant.account.id);
        const path = `/organizations/${created.body.id}`;
        assert.equal(
          await db.organizationMembership.count({
            where: { organizationId: created.body.id },
          }),
          0,
        );
        assert.equal(
          (await request('/organizations', undefined, applicant.headers, 'GET'))
            .status,
          403,
        );
        for (const suffix of ['/profile', '/members', '/audit'])
          assert.equal(
            (await request(path + suffix, undefined, outsider.headers, 'GET'))
              .status,
            403,
          );
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason, expectedVersion: 1 },
              applicant.headers,
            )
          ).status,
          409,
        );
        const updated = await request(
          path + '/profile',
          { profile, reason, expectedVersion: 1 },
          applicant.headers,
          'PATCH',
        );
        assert.equal(updated.status, 200, JSON.stringify(updated.body));
        assert.equal(updated.body.registrationNumber, '900555888');
        const own = await request(
          '/organizations/me?limit=1',
          undefined,
          applicant.headers,
          'GET',
        );
        assert.equal(own.status, 200);
        assert.equal(own.body.total, 1);
        assert.equal(own.body.items[0].id, created.body.id);
        assert.equal('email' in own.body.items[0], false);
        const duplicate = await request(
          '/organizations/requests',
          { name: 'Duplicate Provider', type: 'business', profile },
          outsider.headers,
        );
        assert.equal(duplicate.status, 409);
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason, expectedVersion: 2 },
              applicant.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              path + '/profile',
              { profile: { city: 'Medellin' }, reason, expectedVersion: 3 },
              applicant.headers,
              'PATCH',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              path + '/approve',
              {
                reason,
                expectedVersion: 3,
                responsibleUserId: applicant.account.id,
              },
              applicant.headers,
            )
          ).status,
          403,
        );
        const pending = await db.user.findUnique({
          where: { email: 'pending-role@example.com' },
        });
        assert.equal(
          (
            await request(
              path + '/approve',
              { reason, expectedVersion: 3, responsibleUserId: pending.id },
              adminHeaders,
            )
          ).status,
          409,
        );
        assert.equal(
          (await request(path + '/profile', undefined, adminHeaders, 'GET'))
            .body.version,
          3,
        );
        assert.equal(
          await db.organizationMembership.count({
            where: { organizationId: created.body.id },
          }),
          0,
        );
        assert.equal(
          (
            await request(
              path + '/reject',
              {
                reason: 'Please correct the submitted business identity.',
                expectedVersion: 3,
              },
              adminHeaders,
            )
          ).status,
          201,
        );
        const rejected = await request(
          path + '/profile',
          undefined,
          applicant.headers,
          'GET',
        );
        assert.equal(rejected.body.status, 'rejected');
        assert.equal(
          rejected.body.reviewReason,
          'Please correct the submitted business identity.',
        );
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason, expectedVersion: 4 },
              applicant.headers,
            )
          ).status,
          201,
        );
        const auditBeforeApproval = await db.organizationAuditEntry.count({
          where: { organizationId: created.body.id },
        });
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_org_approval_audit BEFORE INSERT ON organization_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation()',
        );
        try {
          assert.equal(
            (
              await request(
                path + '/approve',
                {
                  reason,
                  expectedVersion: 5,
                  responsibleUserId: applicant.account.id,
                },
                adminHeaders,
              )
            ).status,
            500,
          );
          const persisted = await db.organization.findUnique({
            where: { id: created.body.id },
          });
          assert.equal(persisted.status, 'pending');
          assert.equal(persisted.version, 5);
          assert.equal(persisted.responsibleUserId, null);
          assert.equal(
            await db.organizationMembership.count({
              where: { organizationId: created.body.id },
            }),
            0,
          );
          assert.equal(
            await db.organizationAuditEntry.count({
              where: { organizationId: created.body.id },
            }),
            auditBeforeApproval,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_org_approval_audit ON organization_audit_entries',
          );
        }
        const approved = await request(
          path + '/approve',
          {
            reason,
            expectedVersion: 5,
            responsibleUserId: applicant.account.id,
          },
          adminHeaders,
        );
        assert.equal(approved.status, 201, JSON.stringify(approved.body));
        assert.equal(approved.body.status, 'active');
        assert.equal(approved.body.version, 6);
        assert.equal(
          (await db.user.findUnique({ where: { id: applicant.account.id } }))
            .globalRole,
          'user',
        );
        const membership = await db.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: created.body.id,
              userId: applicant.account.id,
            },
          },
        });
        assert.equal(membership.role, 'business_admin');
        const access = await request(
          '/authorization/me',
          undefined,
          applicant.headers,
          'GET',
        );
        assert.ok(
          access.body.organizations
            .find((o) => o.organizationId === created.body.id)
            .permissions.includes('catalog.manage'),
        );
        const search = await request(
          '/organizations?search=integration%20provider&status=active&type=business&countryCode=CO&limit=1',
          undefined,
          adminHeaders,
          'GET',
        );
        assert.equal(search.status, 200);
        assert.equal(search.body.total, 1);
        assert.equal('legalName' in search.body.items[0], false);
        for (const query of [
          'limit=101',
          'page=0',
          'countryCode=ZZ',
          'unexpected=1',
        ])
          assert.equal(
            (
              await request(
                '/organizations?' + query,
                undefined,
                adminHeaders,
                'GET',
              )
            ).status,
            400,
          );
        Object.assign(organizationFixture, {
          path,
          id: created.body.id,
          applicant,
          outsider,
          profile,
        });
      },
    );
    await t.test(
      'organization state, responsible membership, concurrent updates and audit are enforced atomically',
      async () => {
        const { path, id, applicant, outsider } = organizationFixture;
        const adminHeaders = bearer((await adminLogin()).accessToken);
        const detail = async () => {
          const response = await request(
            path + '/profile',
            undefined,
            adminHeaders,
            'GET',
          );
          assert.equal(response.status, 200);
          return response.body;
        };
        const decision = async (suffix, body, method = 'PATCH') =>
          request(
            path + suffix,
            { reason, expectedVersion: (await detail()).version, ...body },
            adminHeaders,
            method,
          );
        const memberPath = `${path}/members/${outsider.account.id}/role`;
        assert.equal(
          (
            await request(
              memberPath,
              { role: 'business_operator', reason },
              adminHeaders,
              'PUT',
            )
          ).status,
          200,
        );
        assert.equal(
          (await request(path, undefined, outsider.headers, 'GET')).status,
          200,
        );
        for (const suffix of ['/profile', '/members', '/audit'])
          assert.equal(
            (await request(path + suffix, undefined, outsider.headers, 'GET'))
              .status,
            403,
          );
        assert.equal(
          (
            await request(
              path + '/members?limit=1',
              undefined,
              applicant.headers,
              'GET',
            )
          ).body.total,
          2,
        );
        assert.equal(
          (await request(path + '/audit', undefined, applicant.headers, 'GET'))
            .status,
          403,
        );
        const responsiblePath = `${path}/members/${applicant.account.id}/role`;
        assert.equal(
          (await request(responsiblePath, { reason }, adminHeaders, 'DELETE'))
            .status,
          409,
        );
        assert.equal(
          (
            await request(
              responsiblePath,
              { role: 'business_operator', reason },
              adminHeaders,
              'PUT',
            )
          ).status,
          409,
        );
        const responsibleMember = await db.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: id,
              userId: applicant.account.id,
            },
          },
        });
        await assert.rejects(
          db.organizationMembership.delete({
            where: { id: responsibleMember.id },
          }),
        );
        assert.equal(
          (await decision('/status', { status: 'suspended' })).status,
          200,
        );
        const suspended = await request(
          '/authorization/me',
          undefined,
          applicant.headers,
          'GET',
        );
        const scoped = suspended.body.organizations.find(
          (o) => o.organizationId === id,
        );
        assert.equal(scoped.status, 'suspended');
        assert.equal(scoped.permissions.includes('catalog.manage'), false);
        assert.equal(
          (await request('/users/me', undefined, applicant.headers, 'GET'))
            .status,
          200,
        );
        assert.equal(
          (
            await request(
              path + '/profile',
              {
                profile: { city: 'Medellin' },
                reason,
                expectedVersion: (await detail()).version,
              },
              applicant.headers,
              'PATCH',
            )
          ).status,
          409,
        );
        assert.equal(
          (await decision('/status', { status: 'active' })).status,
          200,
        );
        const before = await detail();
        const auditCount = await db.organizationAuditEntry.count({
          where: { organizationId: id },
        });
        assert.equal(
          (
            await request(
              path + '/profile',
              {
                profile: { city: before.city },
                reason,
                expectedVersion: before.version,
              },
              applicant.headers,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal((await detail()).version, before.version);
        assert.equal(
          await db.organizationAuditEntry.count({
            where: { organizationId: id },
          }),
          auditCount,
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_org_lifecycle_audit BEFORE INSERT ON organization_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation()',
        );
        try {
          assert.equal(
            (
              await request(
                path + '/profile',
                {
                  profile: { city: 'Rollback city' },
                  reason,
                  expectedVersion: before.version,
                },
                applicant.headers,
                'PATCH',
              )
            ).status,
            500,
          );
          const persisted = await detail();
          assert.equal(persisted.version, before.version);
          assert.equal(persisted.city, before.city);
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_org_lifecycle_audit ON organization_audit_entries',
          );
        }
        const racing = await Promise.all(
          ['Medellin', 'Cali'].map((city) =>
            request(
              path + '/profile',
              { profile: { city }, reason, expectedVersion: before.version },
              applicant.headers,
              'PATCH',
            ),
          ),
        );
        assert.deepEqual(racing.map((r) => r.status).sort(), [200, 409]);
        assert.equal((await detail()).version, before.version + 1);
        const legal = await request(
          path + '/profile',
          {
            profile: { legalName: 'Integration Provider Updated SAS' },
            reason,
            expectedVersion: (await detail()).version,
          },
          applicant.headers,
          'PATCH',
        );
        assert.equal(legal.status, 200);
        assert.equal(legal.body.status, 'pending');
        const blocked = await request(
          '/authorization/me',
          undefined,
          applicant.headers,
          'GET',
        );
        assert.equal(
          blocked.body.organizations
            .find((o) => o.organizationId === id)
            .permissions.includes('catalog.manage'),
          false,
        );
        assert.equal(
          (await decision('/status', { status: 'active' })).status,
          409,
        );
        assert.equal(
          (
            await decision(
              '/approve',
              { responsibleUserId: applicant.account.id },
              'POST',
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await decision('/responsible', {
              responsibleUserId: outsider.account.id,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await db.organizationMembership.findUnique({
              where: {
                organizationId_userId: {
                  organizationId: id,
                  userId: outsider.account.id,
                },
              },
            })
          ).role,
          'business_admin',
        );
        assert.equal(
          (await request(responsiblePath, { reason }, adminHeaders, 'DELETE'))
            .status,
          200,
        );
        assert.equal(
          (
            await request(
              path + '/profile',
              undefined,
              applicant.headers,
              'GET',
            )
          ).status,
          403,
        );
        const audit = await request(
          path + '/audit?limit=100',
          undefined,
          adminHeaders,
          'GET',
        );
        assert.equal(audit.status, 200);
        assert.ok(
          audit.body.items.some(
            (e) =>
              e.action === 'organization.responsible_changed' &&
              e.nextValue === outsider.account.id,
          ),
        );
        assert.ok(
          audit.body.items.some(
            (e) =>
              e.action === 'organization.profile_updated' &&
              e.previousValue === 'profile',
          ),
        );
        await assert.rejects(
          db.organizationAuditEntry.update({
            where: { id: audit.body.items[0].id },
            data: { reason: 'Tampered lifecycle decision' },
          }),
        );
      },
    );
    await t.test(
      'organization archive clears private data and permanently excludes owned access',
      async () => {
        const { path, id, applicant, outsider } = organizationFixture;
        const adminHeaders = bearer((await adminLogin()).accessToken);
        const detail = await request(
          path + '/profile',
          undefined,
          adminHeaders,
          'GET',
        );
        assert.equal(
          (
            await request(
              path,
              { reason, expectedVersion: detail.body.version },
              outsider.headers,
              'DELETE',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              path,
              { reason, expectedVersion: detail.body.version },
              adminHeaders,
              'DELETE',
            )
          ).status,
          200,
        );
        const row = await db.organization.findUnique({ where: { id } });
        assert.equal(row.status, 'deleted');
        assert.equal(row.name, 'Archived organization');
        for (const field of [
          'legalName',
          'registrationNumber',
          'email',
          'phone',
          'website',
          'countryCode',
          'region',
          'city',
          'address',
          'description',
          'postalCode',
          'addressLine2',
        ])
          assert.equal(row[field], null);
        assert.equal(
          (await request(path + '/profile', undefined, outsider.headers, 'GET'))
            .status,
          403,
        );
        assert.equal(
          (await request(path, undefined, outsider.headers, 'GET')).status,
          403,
        );
        for (const actor of [applicant, outsider])
          for (const query of [
            '',
            '?status=deleted',
            '?status=deleted&search=Archived',
          ]) {
            const own = await request(
              '/organizations/me' + query,
              undefined,
              actor.headers,
              'GET',
            );
            assert.equal(own.status, 200, JSON.stringify(own.body));
            assert.equal(
              own.body.items.some((o) => o.id === id),
              false,
            );
          }
        const access = await request(
          '/authorization/me',
          undefined,
          outsider.headers,
          'GET',
        );
        assert.deepEqual(
          access.body.organizations.find((o) => o.organizationId === id)
            .permissions,
          [],
        );
        assert.equal(
          (
            await request(
              path + '/profile',
              {
                profile: { city: 'Bogota' },
                reason,
                expectedVersion: row.version,
              },
              adminHeaders,
              'PATCH',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              path + '/status',
              { status: 'active', reason, expectedVersion: row.version },
              adminHeaders,
              'PATCH',
            )
          ).status,
          409,
        );
        const count = await db.organizationAuditEntry.count({
          where: { organizationId: id },
        });
        assert.equal(
          (
            await request(
              path,
              { reason, expectedVersion: 1 },
              adminHeaders,
              'DELETE',
            )
          ).status,
          200,
        );
        assert.equal(
          await db.organizationAuditEntry.count({
            where: { organizationId: id },
          }),
          count,
        );
        assert.equal(
          (await request(path + '/audit', undefined, adminHeaders, 'GET'))
            .status,
          200,
        );
      },
    );
    const adoptionFixture = {};
    const uploadPhoto = async (animal, headers, image, mime = 'image/png') => {
      const data = new FormData();
      data.append('reason', reason);
      data.append('expectedVersion', String(animal.version));
      data.append(
        'file',
        new Blob([image], { type: mime }),
        '../../untrusted-name.png',
      );
      const response = await fetch(base + `/animals/${animal.id}/photos`, {
        method: 'POST',
        headers,
        body: data,
      });
      return { status: response.status, body: await response.json() };
    };
    await t.test(
      'animal CRUD enforces personal ownership, active shelter scope and optimistic versions',
      async () => {
        const adminHeaders = bearer((await adminLogin()).accessToken);
        const staff = await createAccount(
            'adoption-staff@example.com',
            adminHeaders,
          ),
          first = await createAccount('adopter-one@example.com', adminHeaders),
          second = await createAccount('adopter-two@example.com', adminHeaders);
        const org = await request(
          '/organizations',
          {
            name: 'Integration Adoption Entity',
            type: 'adoption_entity',
            reason,
            profile: {
              legalName: 'Integration Adoption Entity Foundation',
              registrationNumber: 'ADOPTION-900',
              email: 'shelter@example.com',
              phone: '+573001234567',
              countryCode: 'CO',
              city: 'Bogota',
              address: 'Calle 10 20',
            },
          },
          adminHeaders,
        );
        assert.equal(org.status, 201, JSON.stringify(org.body));
        assert.equal(
          (
            await request(
              `/organizations/${org.body.id}/submit`,
              { reason, expectedVersion: 1 },
              adminHeaders,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              `/organizations/${org.body.id}/approve`,
              {
                reason,
                expectedVersion: 2,
                responsibleUserId: staff.account.id,
              },
              adminHeaders,
            )
          ).status,
          201,
        );
        const personal = await request(
          '/animals',
          { profile: { name: 'Personal Companion', species: 'cat' }, reason },
          first.headers,
        );
        assert.equal(personal.status, 201, JSON.stringify(personal.body));
        assert.equal(personal.body.ownerUserId, first.account.id);
        assert.equal(personal.body.organizationId, null);
        assert.equal(
          (
            await request(
              '/animals',
              {
                profile: { name: 'Injection', species: 'cat' },
                ownerUserId: second.account.id,
                reason,
              },
              first.headers,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/animals/${personal.body.id}`,
              undefined,
              second.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (await request(`/animals/${personal.body.id}`, undefined, {}, 'GET'))
            .status,
          401,
        );
        assert.equal(
          (await request('/animals?limit=101', undefined, first.headers, 'GET'))
            .status,
          400,
        );
        const profile = {
          name: 'Luna',
          species: 'dog',
          sex: 'female',
          size: 'medium',
          dateOfBirth: '2022-04-01',
          birthDateEstimated: true,
          weightGrams: 14000,
          healthNotes: 'PRIVATE_CLINICAL_HISTORY',
          microchip: 'PRIVATE_MICROCHIP',
          specialNeeds: 'Requires a calm household.',
        };
        const animal = await request(
          '/animals',
          { profile, organizationId: org.body.id, reason },
          staff.headers,
        );
        assert.equal(animal.status, 201, JSON.stringify(animal.body));
        assert.equal(animal.body.organizationId, org.body.id);
        assert.equal(animal.body.ownerUserId, null);
        const business = await db.organization.findFirst({
          where: { type: 'business', status: 'active' },
        });
        assert.equal(
          (
            await request(
              '/animals',
              {
                profile: { name: 'Wrong Type', species: 'dog' },
                organizationId: business.id,
                reason,
              },
              adminHeaders,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/animals/${animal.body.id}`,
              undefined,
              first.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/animals/${animal.body.id}`,
              { profile: { status: 'adopted' }, reason, expectedVersion: 1 },
              staff.headers,
              'PATCH',
            )
          ).status,
          400,
        );
        const races = await Promise.all(
          ['Cream', 'Brown'].map((color) =>
            request(
              `/animals/${animal.body.id}`,
              { profile: { color }, reason, expectedVersion: 1 },
              staff.headers,
              'PATCH',
            ),
          ),
        );
        assert.deepEqual(races.map((r) => r.status).sort(), [200, 409]);
        assert.equal(
          (
            await request(
              `/animals/${animal.body.id}`,
              {
                profile: { dateOfBirth: '2026-02-30' },
                reason,
                expectedVersion: 2,
              },
              staff.headers,
              'PATCH',
            )
          ).status,
          400,
        );
        const list = await request(
          `/animals?organizationId=${org.body.id}&species=dog&search=Luna`,
          undefined,
          staff.headers,
          'GET',
        );
        assert.equal(list.status, 200);
        assert.equal(list.body.total, 1);
        assert.equal(
          list.body.items[0].healthNotes,
          'PRIVATE_CLINICAL_HISTORY',
        );
        const sharp = require('sharp');
        const image = await sharp({
          create: {
            width: 2000,
            height: 1000,
            channels: 3,
            background: '#ccaa22',
          },
        })
          .png()
          .withExif({ IFD0: { Artist: 'PRIVATE_PHOTO_AUTHOR' } })
          .toBuffer();
        Object.assign(adoptionFixture, {
          adminHeaders,
          orgId: org.body.id,
          staff,
          first,
          second,
          personal: personal.body,
          animal: list.body.items[0],
          image,
        });
      },
    );
    await t.test(
      'photo uploads reject unsafe images, sanitize metadata and roll back bytes with failed audit',
      async () => {
        const { staff, first, personal, image } = adoptionFixture;
        let { animal } = adoptionFixture;
        assert.equal(
          (await uploadPhoto(animal, first.headers, image)).status,
          403,
        );
        assert.equal(
          (
            await uploadPhoto(
              animal,
              staff.headers,
              Buffer.from('<svg onload="alert(1)"></svg>'),
              'image/png',
            )
          ).status,
          400,
        );
        assert.equal(
          (await uploadPhoto(animal, staff.headers, image, 'image/jpeg'))
            .status,
          400,
        );
        const before = await db.mediaAsset.count();
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_photo_audit BEFORE INSERT ON animal_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation()',
        );
        try {
          assert.equal(
            (await uploadPhoto(animal, staff.headers, image)).status,
            500,
          );
          assert.equal(await db.mediaAsset.count(), before);
          assert.equal(
            (await db.animal.findUnique({ where: { id: animal.id } })).version,
            animal.version,
          );
          assert.equal(
            await db.animalPhoto.count({ where: { animalId: animal.id } }),
            0,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_photo_audit ON animal_audit_entries',
          );
        }
        const uploaded = await uploadPhoto(animal, staff.headers, image);
        assert.equal(uploaded.status, 201, JSON.stringify(uploaded.body));
        animal = uploaded.body;
        assert.equal(animal.photos.length, 1);
        const mediaId = animal.photos[0].mediaId;
        const stored = await db.mediaAsset.findUnique({
          where: { id: mediaId },
        });
        const metadata = await require('sharp')(stored.bytes).metadata();
        assert.equal(metadata.format, 'jpeg');
        assert.equal(metadata.width, 1600);
        assert.equal(metadata.exif, undefined);
        assert.equal(metadata.icc, undefined);
        const photo = await fetch(
          base + `/animals/${animal.id}/photos/${mediaId}`,
          { headers: staff.headers },
        );
        assert.equal(photo.status, 200);
        assert.match(photo.headers.get('content-type'), /image\/jpeg/);
        assert.equal(photo.headers.get('cache-control'), 'no-store');
        assert.equal(
          (
            await fetch(base + `/animals/${personal.id}/photos/${mediaId}`, {
              headers: first.headers,
            })
          ).status,
          404,
        );
        await resetRate();
        let current = personal;
        for (let i = 0; i < 10; i++) {
          const result = await uploadPhoto(current, first.headers, image);
          assert.equal(result.status, 201, JSON.stringify(result.body));
          current = result.body;
        }
        assert.equal(
          (await uploadPhoto(current, first.headers, image)).status,
          409,
        );
        const malformed = new FormData();
        malformed.append('reason', reason);
        malformed.append('expectedVersion', String(animal.version));
        malformed.append(
          'file',
          new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/png' }),
          'oversized.png',
        );
        assert.equal(
          (
            await fetch(base + `/animals/${animal.id}/photos`, {
              method: 'POST',
              headers: staff.headers,
              body: malformed,
            })
          ).status,
          413,
        );
        const audit = await request(
          `/animals/${animal.id}/audit`,
          undefined,
          staff.headers,
          'GET',
        );
        assert.equal(audit.status, 200);
        assert.ok(
          audit.body.items.some((a) => a.action === 'animal.photo_added'),
        );
        await assert.rejects(
          db.animalAuditEntry.update({
            where: { id: audit.body.items[0].id },
            data: { reason: 'Tampered photo audit record' },
          }),
        );
        Object.assign(adoptionFixture, { animal, mediaId, personal: current });
      },
    );
    await t.test(
      'publication moderation exposes a safe reviewed snapshot and immediate current visibility',
      async () => {
        const { staff, first, animal, adminHeaders, orgId, mediaId } =
          adoptionFixture;
        const profile = {
          title: 'Luna seeks a responsible family',
          description: 'Luna is a friendly dog looking for a caring home.',
          conditions:
            'A shelter interview and responsible handover are required.',
          countryCode: 'CO',
          city: 'Bogota',
        };
        assert.equal(
          (
            await request(
              '/adoptions/publications',
              { animalId: adoptionFixture.personal.id, profile, reason },
              first.headers,
            )
          ).status,
          409,
        );
        const draft = await request(
          '/adoptions/publications',
          { animalId: animal.id, profile, reason },
          staff.headers,
        );
        assert.equal(draft.status, 201, JSON.stringify(draft.body));
        const path = `/adoptions/publications/${draft.body.id}`;
        assert.equal(
          (
            await request(
              '/adoptions/publications',
              { animalId: animal.id, profile, reason },
              staff.headers,
            )
          ).status,
          409,
        );
        assert.equal((await request(path, undefined, {}, 'GET')).status, 404);
        assert.equal(
          (await request(path + '/manage', undefined, first.headers, 'GET'))
            .status,
          403,
        );
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason, expectedVersion: 1 },
              staff.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              '/adoptions/moderation/publications',
              undefined,
              staff.headers,
              'GET',
            )
          ).status,
          403,
        );
        const queue = await request(
          '/adoptions/moderation/publications?limit=1',
          undefined,
          adminHeaders,
          'GET',
        );
        assert.equal(queue.status, 200);
        assert.equal(queue.body.items[0].id, draft.body.id);
        assert.equal(
          (
            await request(
              path + '/review',
              { approved: true, reason, expectedVersion: 2 },
              staff.headers,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              path + '/review',
              {
                approved: false,
                reason: 'The publication description needs clarification.',
                expectedVersion: 2,
              },
              adminHeaders,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason, expectedVersion: 3 },
              staff.headers,
            )
          ).status,
          201,
        );
        const published = await request(
          path + '/review',
          { approved: true, reason, expectedVersion: 4 },
          adminHeaders,
        );
        assert.equal(published.status, 201, JSON.stringify(published.body));
        assert.equal(published.body.status, 'published');
        const detail = await request(path, undefined, {}, 'GET');
        assert.equal(detail.status, 200, JSON.stringify(detail.body));
        const serialized = JSON.stringify(detail.body);
        assert.equal(serialized.includes('PRIVATE_CLINICAL_HISTORY'), false);
        assert.equal(serialized.includes('PRIVATE_MICROCHIP'), false);
        assert.equal('createdBy' in detail.body, false);
        assert.equal('ownerUserId' in detail.body.snapshot, false);
        assert.equal(detail.body.snapshot.photos[0].mediaId, mediaId);
        const publicPhoto = await fetch(base + path + `/photos/${mediaId}`);
        assert.equal(publicPhoto.status, 200);
        assert.equal(publicPhoto.headers.get('cache-control'), 'no-store');
        const listing = await request(
          '/adoptions/publications?species=dog&countryCode=CO&city=Bogota&limit=1',
          undefined,
          {},
          'GET',
        );
        assert.equal(listing.status, 200);
        assert.equal(listing.body.items.length, 1);
        assert.equal(
          (
            await request(
              '/adoptions/publications?limit=1&cursor=' +
                listing.body.nextCursor,
              undefined,
              {},
              'GET',
            )
          ).body.items.length,
          0,
        );
        const edited = await request(
          `/animals/${animal.id}`,
          {
            profile: { name: 'Luna Updated Privately' },
            reason,
            expectedVersion: animal.version,
          },
          staff.headers,
          'PATCH',
        );
        assert.equal(edited.status, 200);
        assert.equal(
          (await request(path, undefined, {}, 'GET')).body.snapshot.name,
          'Luna',
        );
        const changed = await request(
          path,
          {
            profile: {
              description: 'A clarified friendly companion profile for review.',
            },
            reason,
            expectedVersion: 5,
          },
          staff.headers,
          'PATCH',
        );
        assert.equal(changed.status, 200);
        assert.equal(changed.body.status, 'draft');
        assert.equal((await request(path, undefined, {}, 'GET')).status, 404);
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason, expectedVersion: 6 },
              staff.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              path + '/review',
              { approved: true, reason, expectedVersion: 7 },
              adminHeaders,
            )
          ).status,
          201,
        );
        assert.equal(
          (await request(path, undefined, {}, 'GET')).body.snapshot.name,
          'Luna Updated Privately',
        );
        Object.assign(adoptionFixture, {
          publicationId: draft.body.id,
          path,
          animal: edited.body,
          publicationVersion: 8,
          profile,
        });
      },
    );
    await t.test(
      'application consent, contact privacy, entity suspension and withdrawal preserve resource isolation',
      async () => {
        const {
          first,
          second,
          staff,
          adminHeaders,
          orgId,
          path,
          publicationId,
        } = adoptionFixture;
        const body = {
          message: 'I can provide a responsible and caring home.',
          consent: true,
          expectedPublicationVersion: 8,
        };
        assert.equal(
          (await request(path + '/requests', body, first.headers)).status,
          409,
        );
        for (const person of [first, second])
          assert.equal(
            (
              await request(
                '/users/me',
                { phone: '+573001234567', countryCode: 'CO', city: 'Bogota' },
                person.headers,
                'PATCH',
              )
            ).status,
            200,
          );
        assert.equal(
          (
            await request(
              path + '/requests',
              { ...body, consent: false },
              first.headers,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              path + '/requests',
              { ...body, expectedPublicationVersion: 7 },
              first.headers,
            )
          ).status,
          409,
        );
        const attempts = await Promise.all([
          request(path + '/requests', body, first.headers),
          request(path + '/requests', body, first.headers),
        ]);
        assert.deepEqual(attempts.map((r) => r.status).sort(), [201, 409]);
        const initial = attempts.find((r) => r.status === 201).body;
        assert.equal(initial.publicationVersion, 8);
        assert.equal(
          initial.conditionsAccepted,
          adoptionFixture.profile.conditions,
        );
        const privateRequest = await request(
          '/adoptions/requests/' + initial.id,
          undefined,
          staff.headers,
          'GET',
        );
        assert.equal(privateRequest.status, 200);
        assert.equal(
          privateRequest.body.contact.email,
          'adopter-one@example.com',
        );
        assert.equal('address' in privateRequest.body.contact, false);
        assert.equal(
          (
            await request(
              '/adoptions/requests/' + initial.id,
              undefined,
              second.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/adoptions/requests/me',
              undefined,
              first.headers,
              'GET',
            )
          ).body.total,
          1,
        );
        assert.equal(
          (await request(path + '/requests', undefined, first.headers, 'GET'))
            .status,
          403,
        );
        assert.equal(
          (
            await request(
              `/organizations/${orgId}/status`,
              { status: 'suspended', reason, expectedVersion: 3 },
              adminHeaders,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal((await request(path, undefined, {}, 'GET')).status, 404);
        assert.equal(
          (await fetch(base + path + `/photos/${adoptionFixture.mediaId}`))
            .status,
          404,
        );
        assert.equal(
          (await request('/adoptions/publications', undefined, {}, 'GET')).body
            .items.length,
          0,
        );
        assert.equal(
          (await request(path + '/requests', body, second.headers)).status,
          409,
        );
        assert.equal(
          (
            await request(
              '/adoptions/requests/' + initial.id + '/review',
              { status: 'approved', reason, expectedVersion: 1 },
              staff.headers,
              'PATCH',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/adoptions/requests/' + initial.id + '/withdraw',
              { reason, expectedVersion: 1 },
              first.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              `/organizations/${orgId}/status`,
              { status: 'active', reason, expectedVersion: 4 },
              adminHeaders,
              'PATCH',
            )
          ).status,
          200,
        );
        const application = await request(
            path + '/requests',
            body,
            first.headers,
          ),
          another = await request(path + '/requests', body, second.headers);
        assert.equal(application.status, 201, JSON.stringify(application.body));
        assert.equal(another.status, 201);
        assert.equal(
          (
            await request(
              '/users/me',
              { phone: '+573001234567', countryCode: 'CO', city: 'Bogota' },
              staff.headers,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          (await request(path + '/requests', body, staff.headers)).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/adoptions/organizations/${orgId}/publications`,
              undefined,
              staff.headers,
              'GET',
            )
          ).body.items[0].id,
          publicationId,
        );
        Object.assign(adoptionFixture, {
          application: application.body,
          another: another.body,
        });
      },
    );
    await t.test(
      'changed adoption conditions require new consent before review or handover',
      async () => {
        const { path, staff, adminHeaders, first, second } = adoptionFixture;
        const profile = {
          conditions:
            'An interview, home suitability review and confirmed handover are required.',
        };
        assert.equal(
          (
            await request(
              path,
              { profile, reason, expectedVersion: 8 },
              staff.headers,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason, expectedVersion: 9 },
              staff.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              path + '/review',
              { approved: true, reason, expectedVersion: 10 },
              adminHeaders,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              '/adoptions/requests/' +
                adoptionFixture.application.id +
                '/review',
              { status: 'approved', reason, expectedVersion: 1 },
              staff.headers,
              'PATCH',
            )
          ).status,
          409,
        );
        for (const [person, old] of [
          [first, adoptionFixture.application],
          [second, adoptionFixture.another],
        ])
          assert.equal(
            (
              await request(
                '/adoptions/requests/' + old.id + '/withdraw',
                { reason, expectedVersion: 1 },
                person.headers,
              )
            ).status,
            201,
          );
        const body = {
          message: 'I have reviewed and accepted the updated requirements.',
          consent: true,
          expectedPublicationVersion: 11,
        };
        const application = await request(
            path + '/requests',
            body,
            first.headers,
          ),
          another = await request(path + '/requests', body, second.headers);
        assert.equal(application.status, 201);
        assert.equal(another.status, 201);
        assert.equal(application.body.conditionsAccepted, profile.conditions);
        Object.assign(adoptionFixture, {
          application: application.body,
          another: another.body,
          publicationVersion: 11,
        });
      },
    );
    await t.test(
      'one applicant can be selected and completion atomically updates all three features with audit rollback',
      async () => {
        const { staff, application, another, animal, path, publicationId } =
          adoptionFixture;
        assert.equal(
          (
            await request(
              '/adoptions/requests/' + application.id + '/complete',
              { reason, expectedVersion: 1 },
              staff.headers,
            )
          ).status,
          409,
        );
        const race = await Promise.all(
          [application, another].map((target) =>
            request(
              '/adoptions/requests/' + target.id + '/review',
              { status: 'approved', reason, expectedVersion: 1 },
              staff.headers,
              'PATCH',
            ),
          ),
        );
        assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
        const selected = race.find((r) => r.status === 200).body;
        const loser = selected.id === application.id ? another : application;
        const applicant =
          selected.applicantId === adoptionFixture.first.account.id
            ? adoptionFixture.first
            : adoptionFixture.second;
        assert.equal(
          (
            await request(
              '/adoptions/requests/' + selected.id + '/complete',
              { reason, expectedVersion: selected.version },
              applicant.headers,
            )
          ).status,
          403,
        );
        const animalAudits = await db.animalAuditEntry.count({
          where: { animalId: animal.id },
        });
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_adoption_completion_audit BEFORE INSERT ON adoption_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation()',
        );
        try {
          assert.equal(
            (
              await request(
                '/adoptions/requests/' + selected.id + '/complete',
                { reason, expectedVersion: selected.version },
                staff.headers,
              )
            ).status,
            500,
          );
          assert.equal(
            (await db.animal.findUnique({ where: { id: animal.id } })).status,
            'active',
          );
          assert.equal(
            (
              await db.adoptionPublication.findUnique({
                where: { id: publicationId },
              })
            ).status,
            'published',
          );
          assert.equal(
            (
              await db.adoptionRequest.findUnique({
                where: { id: selected.id },
              })
            ).status,
            'approved',
          );
          assert.equal(
            (await db.adoptionRequest.findUnique({ where: { id: loser.id } }))
              .status,
            'submitted',
          );
          assert.equal(
            await db.animalAuditEntry.count({ where: { animalId: animal.id } }),
            animalAudits,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_adoption_completion_audit ON adoption_audit_entries',
          );
        }
        const completions = await Promise.all([
          request(
            '/adoptions/requests/' + selected.id + '/complete',
            { reason, expectedVersion: selected.version },
            staff.headers,
          ),
          request(
            '/adoptions/requests/' + selected.id + '/complete',
            { reason, expectedVersion: selected.version },
            staff.headers,
          ),
        ]);
        assert.deepEqual(completions.map((r) => r.status).sort(), [201, 409]);
        assert.equal(
          (await db.animal.findUnique({ where: { id: animal.id } })).status,
          'adopted',
        );
        assert.equal(
          (await db.adoptionRequest.findUnique({ where: { id: loser.id } }))
            .status,
          'closed',
        );
        assert.equal((await request(path, undefined, {}, 'GET')).status, 404);
        assert.equal(
          (
            await request(
              '/animals/' + animal.id + '/status',
              {
                status: 'active',
                reason,
                expectedVersion: (
                  await db.animal.findUnique({ where: { id: animal.id } })
                ).version,
              },
              staff.headers,
              'PATCH',
            )
          ).status,
          409,
        );
        const audit = await request(
          path + '/audit?limit=100',
          undefined,
          staff.headers,
          'GET',
        );
        assert.equal(audit.status, 200);
        assert.equal(
          audit.body.items.filter((a) => a.action === 'request.completed')
            .length,
          1,
        );
        await assert.rejects(
          db.adoptionAuditEntry.delete({
            where: { id: audit.body.items[0].id },
          }),
        );
      },
    );
    await t.test(
      'detached photos stop public access and archived/deceased animals and publications are terminal',
      async () => {
        const { staff, first, adminHeaders, image, orgId, profile } =
          adoptionFixture;
        const created = await request(
          '/animals',
          {
            profile: { name: 'Photo Removal Animal', species: 'cat' },
            organizationId: orgId,
            reason,
          },
          staff.headers,
        );
        assert.equal(created.status, 201);
        let animal = (await uploadPhoto(created.body, staff.headers, image))
          .body;
        const draft = await request(
          '/adoptions/publications',
          { animalId: animal.id, profile, reason },
          staff.headers,
        );
        assert.equal(draft.status, 201);
        const path = '/adoptions/publications/' + draft.body.id;
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason, expectedVersion: 1 },
              staff.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              path + '/review',
              { reason, approved: true, expectedVersion: 2 },
              adminHeaders,
            )
          ).status,
          201,
        );
        const mediaId = animal.photos[0].mediaId;
        const removed = await request(
          `/animals/${animal.id}/photos/${mediaId}`,
          { reason, expectedVersion: animal.version },
          staff.headers,
          'DELETE',
        );
        assert.equal(removed.status, 200);
        assert.equal(
          (await db.mediaAsset.findUnique({ where: { id: mediaId } })).bytes,
          null,
        );
        assert.equal((await request(path, undefined, {}, 'GET')).status, 404);
        animal = (await uploadPhoto(removed.body, staff.headers, image)).body;
        assert.equal((await request(path, undefined, {}, 'GET')).status, 404);
        assert.equal(
          (
            await request(
              path + '/pause',
              { reason, expectedVersion: 3 },
              staff.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason, expectedVersion: 4 },
              staff.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              path + '/review',
              { reason, approved: true, expectedVersion: 5 },
              adminHeaders,
            )
          ).status,
          201,
        );
        const application = await request(
          path + '/requests',
          {
            message: 'A responsible adopter for this second animal.',
            consent: true,
            expectedPublicationVersion: 6,
          },
          first.headers,
        );
        assert.equal(application.status, 201);
        assert.equal(
          (
            await request(
              `/animals/${animal.id}/status`,
              { status: 'deceased', reason, expectedVersion: animal.version },
              staff.headers,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal((await request(path, undefined, {}, 'GET')).status, 404);
        assert.equal(
          (
            await request(
              path,
              { reason, expectedVersion: 6 },
              staff.headers,
              'DELETE',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await db.adoptionRequest.findUnique({
              where: { id: application.body.id },
            })
          ).status,
          'closed',
        );
        const archived = await request(
          `/animals/${animal.id}`,
          { reason, expectedVersion: animal.version + 1 },
          staff.headers,
          'DELETE',
        );
        assert.equal(archived.status, 200);
        assert.equal(archived.body.status, 'archived');
        assert.equal(
          (
            await request(
              `/animals/${animal.id}`,
              {
                profile: { name: 'Reactivated' },
                reason,
                expectedVersion: archived.body.version,
              },
              staff.headers,
              'PATCH',
            )
          ).status,
          409,
        );
      },
    );
    const commerce = {};
    await t.test(
      'catalog taxonomy, company ownership, SKU isolation and moderated publication enforce contracts',
      async () => {
        const admin = bearer((await adminLogin()).accessToken);
        const staff = await createAccount('catalog-staff@example.com', admin);
        const outsider = await createAccount(
          'catalog-outsider@example.com',
          admin,
        );
        const why = 'Supplier product and warehouse records verified.';
        const org = await request(
          '/organizations',
          {
            name: 'Commerce Provider',
            type: 'business',
            profile: {
              legalName: 'Commerce Provider SAS',
              registrationNumber: '900777123',
              email: 'commerce@example.com',
              phone: '+573001234567',
              countryCode: 'CO',
              city: 'Bogota',
              address: 'Calle 15 20',
            },
            reason: why,
          },
          admin,
        );
        assert.equal(org.status, 201, JSON.stringify(org.body));
        assert.equal(
          (
            await request(
              `/organizations/${org.body.id}/submit`,
              { reason: why, expectedVersion: 1 },
              admin,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              `/organizations/${org.body.id}/approve`,
              {
                reason: why,
                expectedVersion: 2,
                responsibleUserId: staff.account.id,
              },
              admin,
            )
          ).status,
          201,
        );
        const category = await request(
          '/catalog/admin/categories',
          {
            name: 'Animal food',
            slug: 'animal-food',
            description: 'Complete food for companion animals.',
            reason: why,
          },
          admin,
        );
        assert.equal(category.status, 201, JSON.stringify(category.body));
        assert.equal(
          (
            await request(
              '/catalog/admin/categories',
              { name: 'Fake taxonomy', slug: 'fake-taxonomy', reason: why },
              staff.headers,
            )
          ).status,
          403,
        );
        const categoryAudit = await request(
          '/catalog/admin/categories/' + category.body.id + '/audit',
          undefined,
          admin,
          'GET',
        );
        assert.equal(
          categoryAudit.status,
          200,
          JSON.stringify(categoryAudit.body),
        );
        assert.ok(
          categoryAudit.body.items.every(
            (e) => e.categoryId === category.body.id,
          ),
        );
        assert.equal(
          (
            await request(
              '/catalog/admin/categories/' + category.body.id + '/audit',
              undefined,
              staff.headers,
              'GET',
            )
          ).status,
          403,
        );
        const profile = {
          name: 'Balanced dog food',
          description: 'Complete dry food for adult dogs.',
          brand: 'Test Supplier',
          categoryId: category.body.id,
        };
        const product = await request(
          '/catalog/admin/products',
          {
            organizationId: org.body.id,
            profile,
            currency: 'COP',
            reason: why,
          },
          staff.headers,
        );
        assert.equal(product.status, 201, JSON.stringify(product.body));
        const path = '/catalog/admin/products/' + product.body.id;
        assert.equal(
          (
            await request(
              '/catalog/products/' + product.body.id,
              undefined,
              {},
              'GET',
            )
          ).status,
          404,
        );
        assert.equal(
          (await request(path, undefined, outsider.headers, 'GET')).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/catalog/admin/products',
              {
                organizationId: org.body.id,
                profile,
                reason: why,
                status: 'published',
              },
              staff.headers,
            )
          ).status,
          400,
        );
        const variant = await request(
          path + '/variants',
          {
            profile: {
              sku: 'dog-food-s',
              priceMinor: 1000,
              attributes: { size: 'small' },
            },
            reason: why,
            expectedVersion: 1,
          },
          staff.headers,
        );
        assert.equal(variant.status, 201, JSON.stringify(variant.body));
        assert.equal(variant.body.variant.sku, 'DOG-FOOD-S');
        const other = await request(
          '/catalog/admin/products',
          {
            organizationId: org.body.id,
            profile: { ...profile, name: 'Another product' },
            reason: why,
          },
          staff.headers,
        );
        assert.equal(other.status, 201);
        assert.equal(
          (
            await request(
              '/catalog/admin/products/' + other.body.id + '/variants',
              {
                profile: { sku: 'DOG-FOOD-S', priceMinor: 100 },
                reason: why,
                expectedVersion: 1,
              },
              staff.headers,
            )
          ).status,
          409,
        );
        const sharp = require('sharp');
        const bytes = await sharp({
          create: { width: 100, height: 100, channels: 3, background: 'white' },
        })
          .png()
          .toBuffer();
        const form = new FormData();
        form.set(
          'file',
          new Blob([bytes], { type: 'image/png' }),
          '../unsafe-filename.png',
        );
        form.set('reason', why);
        form.set('expectedVersion', '2');
        const photoResponse = await fetch(base + path + '/photos', {
          method: 'POST',
          headers: staff.headers,
          body: form,
        });
        const photo = await photoResponse.json();
        assert.equal(photoResponse.status, 201, JSON.stringify(photo));
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason: why, expectedVersion: 3 },
              staff.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              path,
              {
                profile: { name: 'Pending change' },
                reason: why,
                expectedVersion: 4,
              },
              staff.headers,
              'PATCH',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              path + '/review',
              { reason: why, expectedVersion: 4, approved: true },
              staff.headers,
            )
          ).status,
          403,
        );
        const queue = await request(
          '/catalog/admin/moderation/products',
          undefined,
          admin,
          'GET',
        );
        assert.equal(queue.status, 200);
        assert.ok(queue.body.items.some((p) => p.id === product.body.id));
        assert.equal(
          (
            await request(
              path + '/review',
              { reason: why, expectedVersion: 4, approved: true },
              admin,
            )
          ).status,
          201,
        );
        const listing = await request(
          '/catalog/products/' + product.body.id,
          undefined,
          {},
          'GET',
        );
        assert.equal(listing.status, 200, JSON.stringify(listing.body));
        assert.equal(listing.body.product.version, 5);
        assert.equal('reviewedBy' in listing.body.product, false);
        assert.equal('createdBy' in listing.body.product, false);
        assert.equal(
          (
            await request(
              '/catalog/products?currency=COP&minPriceMinor=900&maxPriceMinor=1200&search=dog',
              undefined,
              {},
              'GET',
            )
          ).body.items.length,
          1,
        );
        assert.equal(
          (
            await request(
              '/catalog/products?minPriceMinor=100',
              undefined,
              {},
              'GET',
            )
          ).status,
          400,
        );
        const publicPhoto = await fetch(
          base +
            '/catalog/products/' +
            product.body.id +
            '/photos/' +
            photo.photo.mediaId,
        );
        assert.equal(publicPhoto.status, 200);
        assert.equal(publicPhoto.headers.get('cache-control'), 'no-store');
        Object.assign(commerce, {
          admin,
          staff,
          outsider,
          why,
          orgId: org.body.id,
          category: category.body,
          path,
          productId: product.body.id,
          variantId: variant.body.variant.id,
          photo: photo.photo,
        });
      },
    );
    await t.test(
      'stock idempotency and simultaneous reservations prevent overselling or duplicate physical movements',
      async () => {
        const { staff, outsider, variantId, why } = commerce;
        const path = '/inventory/variants/' + variantId;
        assert.equal(
          (await request(path, undefined, outsider.headers, 'GET')).status,
          403,
        );
        const initial = await request(path, undefined, staff.headers, 'GET');
        assert.equal(initial.status, 200, JSON.stringify(initial.body));
        assert.deepEqual(
          [initial.body.onHand, initial.body.reserved, initial.body.version],
          [0, 0, 1],
        );
        const receipt = {
          kind: 'receipt',
          quantity: 10,
          reason: why,
          expectedVersion: 1,
          idempotencyKey: randomUUID(),
        };
        const received = await request(
          path + '/movements',
          receipt,
          staff.headers,
        );
        assert.equal(received.status, 201, JSON.stringify(received.body));
        assert.equal(received.body.stock.onHand, 10);
        const replay = await request(
          path + '/movements',
          receipt,
          staff.headers,
        );
        assert.equal(replay.status, 201);
        assert.equal(replay.body.movement.id, received.body.movement.id);
        assert.equal(replay.body.stock.onHand, 10);
        assert.equal(
          (
            await request(
              path + '/movements',
              { ...receipt, quantity: 11 },
              staff.headers,
            )
          ).status,
          409,
        );
        const holdBody = {
          quantity: 7,
          expiresAt: new Date(Date.now() + 120000).toISOString(),
          referenceId: randomUUID(),
          expectedVersion: 2,
          reason: why,
        };
        const attempts = await Promise.all([
          request(
            path + '/holds',
            { ...holdBody, idempotencyKey: randomUUID() },
            staff.headers,
          ),
          request(
            path + '/holds',
            { ...holdBody, idempotencyKey: randomUUID() },
            staff.headers,
          ),
        ]);
        assert.deepEqual(
          attempts.map((r) => r.status).sort(),
          [201, 409],
          JSON.stringify(attempts),
        );
        const selected = attempts.find((r) => r.status === 201).body;
        assert.deepEqual(
          [
            selected.stock.onHand,
            selected.stock.reserved,
            selected.stock.available,
          ],
          [10, 7, 3],
        );
        assert.equal(
          (
            await request(
              path + '/movements',
              {
                kind: 'issue',
                quantity: 4,
                reason: why,
                expectedVersion: 3,
                idempotencyKey: randomUUID(),
              },
              staff.headers,
            )
          ).status,
          409,
        );
        const available = await request(
          '/inventory/availability?variantIds=' + variantId,
          undefined,
          {},
          'GET',
        );
        assert.equal(available.status, 200, JSON.stringify(available.body));
        assert.deepEqual(available.body.items, [{ variantId, available: 3 }]);
        assert.equal(
          (
            await request(
              '/inventory/holds/' + selected.hold.id,
              undefined,
              outsider.headers,
              'GET',
            )
          ).status,
          403,
        );
        const decision = {
          reason: why,
          expectedVersion: 3,
          idempotencyKey: randomUUID(),
        };
        const completed = await request(
          '/inventory/holds/' + selected.hold.id + '/consume',
          decision,
          staff.headers,
        );
        assert.equal(completed.status, 201, JSON.stringify(completed.body));
        assert.deepEqual(
          [completed.body.stock.onHand, completed.body.stock.reserved],
          [3, 0],
        );
        assert.equal(
          (
            await request(
              '/inventory/holds/' + selected.hold.id + '/consume',
              decision,
              staff.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              '/inventory/holds/' + selected.hold.id + '/consume',
              { ...decision, expectedVersion: 4, idempotencyKey: randomUUID() },
              staff.headers,
            )
          ).status,
          409,
        );
        assert.equal(
          (await request(path + '/movements', receipt, staff.headers)).body
            .stock.onHand,
          3,
        );
        commerce.consumedHoldId = selected.hold.id;
      },
    );
    await t.test(
      'persisted reservation expiry releases units once and rejects late consumption',
      async () => {
        const { staff, variantId, why } = commerce;
        const path = '/inventory/variants/' + variantId;
        const stock = (await request(path, undefined, staff.headers, 'GET'))
          .body;
        const body = {
          quantity: 1,
          expiresAt: new Date(Date.now() + 1000).toISOString(),
          referenceId: randomUUID(),
          expectedVersion: stock.version,
          reason: why,
          idempotencyKey: randomUUID(),
        };
        const reserved = await request(path + '/holds', body, staff.headers);
        assert.equal(reserved.status, 201, JSON.stringify(reserved.body));
        assert.equal(
          (await request(path + '/holds', body, staff.headers)).body.hold.id,
          reserved.body.hold.id,
        );
        const secondHold = await request(
          path + '/holds',
          {
            ...body,
            expectedVersion: reserved.body.stock.version,
            idempotencyKey: randomUUID(),
            referenceId: randomUUID(),
          },
          staff.headers,
        );
        assert.equal(secondHold.status, 201, JSON.stringify(secondHold.body));
        await new Promise((r) => setTimeout(r, 1200));
        assert.equal(
          (
            await request(
              '/inventory/availability?variantIds=' + variantId,
              undefined,
              {},
              'GET',
            )
          ).body.items[0].available,
          3,
        );
        const released = await request(path, undefined, staff.headers, 'GET');
        assert.equal(released.status, 200, JSON.stringify(released.body));
        assert.equal(released.body.reserved, 0);
        assert.equal(
          (
            await request(
              '/inventory/holds/' + reserved.body.hold.id,
              undefined,
              staff.headers,
              'GET',
            )
          ).body.status,
          'expired',
        );
        assert.equal(
          (
            await request(
              '/inventory/holds/' + reserved.body.hold.id + '/consume',
              {
                reason: why,
                expectedVersion: released.body.version,
                idempotencyKey: randomUUID(),
              },
              staff.headers,
            )
          ).status,
          409,
        );
        assert.equal(
          await db.inventoryMovement.count({
            where: { holdId: reserved.body.hold.id, kind: 'expire' },
          }),
          1,
        );
        assert.equal(
          await db.inventoryMovement.count({
            where: { holdId: secondHold.body.hold.id, kind: 'expire' },
          }),
          1,
        );
        assert.equal(
          (await request(path, undefined, staff.headers, 'GET')).body.version,
          released.body.version,
        );
      },
    );
    await t.test(
      'stock ledger failures roll back balances and database protections reject unaudited changes',
      async () => {
        const { staff, variantId, why, consumedHoldId } = commerce;
        const path = '/inventory/variants/' + variantId;
        const before = (await request(path, undefined, staff.headers, 'GET'))
          .body;
        await db.$executeRawUnsafe(
          "CREATE FUNCTION reject_inventory_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated stock ledger failure'; END $$",
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_inventory_test BEFORE INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION reject_inventory_test()',
        );
        try {
          assert.equal(
            (
              await request(
                path + '/movements',
                {
                  kind: 'receipt',
                  quantity: 2,
                  reason: why,
                  expectedVersion: before.version,
                  idempotencyKey: randomUUID(),
                },
                staff.headers,
              )
            ).status,
            500,
          );
          assert.equal(
            (await db.inventoryStock.findUnique({ where: { variantId } }))
              .onHand,
            before.onHand,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_inventory_test ON inventory_movements',
          );
          await db.$executeRawUnsafe('DROP FUNCTION reject_inventory_test()');
        }
        await assert.rejects(
          db.inventoryStock.update({
            where: { variantId },
            data: { onHand: 100 },
          }),
        );
        await assert.rejects(
          db.inventoryHold.update({
            where: { id: consumedHoldId },
            data: { status: 'active' },
          }),
        );
        const movement = await db.inventoryMovement.findFirst({
          where: { variantId },
        });
        await assert.rejects(
          db.inventoryMovement.update({
            where: { id: movement.id },
            data: { reason: 'Altered warehouse history.' },
          }),
        );
        const ledger = await request(
          path + '/movements',
          undefined,
          staff.headers,
          'GET',
        );
        assert.equal(ledger.status, 200, JSON.stringify(ledger.body));
        assert.equal('fingerprint' in ledger.body.items[0], false);
      },
    );
    await t.test(
      'category or business suspension immediately hides products and blocks stock reservations',
      async () => {
        const { admin, staff, variantId, why, category, productId, orgId } =
          commerce;
        const categoryPath = '/catalog/admin/categories/' + category.id;
        assert.equal(
          (
            await request(
              categoryPath,
              {
                profile: { status: 'inactive' },
                reason: why,
                expectedVersion: 1,
              },
              admin,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              '/catalog/products/' + productId,
              undefined,
              {},
              'GET',
            )
          ).status,
          404,
        );
        assert.deepEqual(
          (
            await request(
              '/inventory/availability?variantIds=' + variantId,
              undefined,
              {},
              'GET',
            )
          ).body.items,
          [],
        );
        assert.equal(
          (
            await request(
              categoryPath,
              {
                profile: { status: 'active' },
                reason: why,
                expectedVersion: 2,
              },
              admin,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              '/catalog/products/' + productId,
              undefined,
              {},
              'GET',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              '/organizations/' + orgId + '/status',
              { status: 'suspended', reason: why, expectedVersion: 3 },
              admin,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              '/catalog/products/' + productId,
              undefined,
              {},
              'GET',
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await request(
              '/inventory/variants/' + variantId,
              undefined,
              staff.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/organizations/' + orgId + '/status',
              { status: 'active', reason: why, expectedVersion: 4 },
              admin,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              '/catalog/products/' + productId,
              undefined,
              {},
              'GET',
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      'photo audit rollback and price edits preserve review boundaries and archived product history',
      async () => {
        const { admin, staff, variantId, why, path, productId, photo } =
          commerce;
        await db.$executeRawUnsafe(
          "CREATE FUNCTION reject_catalog_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated catalog audit failure'; END $$",
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_catalog_test BEFORE INSERT ON catalog_audit_entries FOR EACH ROW EXECUTE FUNCTION reject_catalog_test()',
        );
        const beforeMedia = await db.mediaAsset.count();
        try {
          const bytes = await require('sharp')({
            create: { width: 30, height: 30, channels: 3, background: 'white' },
          })
            .png()
            .toBuffer();
          const form = new FormData();
          form.set(
            'file',
            new Blob([bytes], { type: 'image/png' }),
            'photo.png',
          );
          form.set('reason', why);
          form.set('expectedVersion', '5');
          const response = await fetch(base + path + '/photos', {
            method: 'POST',
            headers: staff.headers,
            body: form,
          });
          assert.equal(response.status, 500);
          assert.equal(await db.mediaAsset.count(), beforeMedia);
          assert.equal(
            (await db.catalogProduct.findUnique({ where: { id: productId } }))
              .status,
            'published',
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_catalog_test ON catalog_audit_entries',
          );
          await db.$executeRawUnsafe('DROP FUNCTION reject_catalog_test()');
        }
        assert.equal(
          (
            await request(
              path + '/variants/' + variantId,
              {
                profile: { priceMinor: 1500 },
                reason: why,
                expectedVersion: 5,
              },
              staff.headers,
              'PATCH',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              '/catalog/products/' + productId,
              undefined,
              {},
              'GET',
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await request(
              path + '/submit',
              { reason: why, expectedVersion: 6 },
              staff.headers,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              path + '/review',
              { reason: why, expectedVersion: 7, approved: true },
              admin,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await request(
              '/catalog/products/' + productId,
              undefined,
              {},
              'GET',
            )
          ).body.variants[0].priceMinor,
          1500,
        );
        const stockPath = '/inventory/variants/' + variantId;
        const balance = (
          await request(stockPath, undefined, staff.headers, 'GET')
        ).body;
        const issue = await request(
          stockPath + '/movements',
          {
            kind: 'issue',
            quantity: balance.onHand,
            expectedVersion: balance.version,
            idempotencyKey: randomUUID(),
            reason: why,
          },
          staff.headers,
        );
        assert.equal(issue.status, 201, JSON.stringify(issue.body));
        assert.equal(issue.body.stock.onHand, 0);
        await assert.rejects(
          db.inventoryStock.delete({ where: { variantId } }),
        );
        assert.equal(
          (
            await request(
              path,
              { reason: why, expectedVersion: 8 },
              staff.headers,
              'DELETE',
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              '/catalog/products/' + productId,
              undefined,
              {},
              'GET',
            )
          ).status,
          404,
        );
        const missingPhoto = await fetch(
          base + '/catalog/products/' + productId + '/photos/' + photo.mediaId,
        );
        assert.equal(missingPhoto.status, 404);
        assert.equal(
          (
            await request(
              path,
              {
                profile: { name: 'Revived product' },
                reason: why,
                expectedVersion: 9,
              },
              staff.headers,
              'PATCH',
            )
          ).status,
          409,
        );
        const audit = await request(
          path + '/audit',
          undefined,
          staff.headers,
          'GET',
        );
        assert.equal(audit.status, 200, JSON.stringify(audit.body));
        assert.ok(audit.body.items.some((e) => e.action === 'product.archive'));
        await assert.rejects(
          db.catalogAuditEntry.update({
            where: { id: audit.body.items[0].id },
            data: { reason: 'Altered supplier history.' },
          }),
        );
      },
    );

    const purchase = {};
    const systemOrder = (
      action,
      order,
      payment = randomUUID(),
      amount = order?.totalMinor,
      currency = order?.currency,
      time,
    ) =>
      execFileSync(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/testing/order-system-port.ts',
          action,
          order?.id ?? '',
          payment,
          String(amount ?? 0),
          currency ?? '',
          time ?? '',
        ],
        {
          env: process.env,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      ).trim();
    await t.test(
      'persistent cart enforces buyer scope, one seller and strict optimistic contracts',
      async () => {
        const admin = bearer((await adminLogin()).accessToken),
          staff = await createAccount('orders-staff@example.com', admin),
          buyer = await createAccount('orders-buyer@example.com', admin),
          other = await createAccount('orders-other@example.com', admin);
        const why = 'Commercial conditions and warehouse records verified.';
        const expect = (r, status = 201) => {
          assert.equal(r.status, status, JSON.stringify(r.body));
          return r.body;
        };
        const org = expect(
          await request(
            '/organizations',
            {
              name: 'Order Supplier',
              type: 'business',
              profile: {
                legalName: 'Order Supplier SAS',
                registrationNumber: '900555123',
                email: 'orders@example.com',
                phone: '+573001234567',
                countryCode: 'CO',
                city: 'Bogota',
                address: 'Calle 10 20',
              },
              reason: why,
            },
            admin,
          ),
        );
        expect(
          await request(
            `/organizations/${org.id}/submit`,
            { reason: why, expectedVersion: 1 },
            admin,
          ),
        );
        expect(
          await request(
            `/organizations/${org.id}/approve`,
            {
              reason: why,
              expectedVersion: 2,
              responsibleUserId: staff.account.id,
            },
            admin,
          ),
        );
        const category = expect(
          await request(
            '/catalog/admin/categories',
            { name: 'Order supplies', slug: 'order-supplies', reason: why },
            admin,
          ),
        );
        const product = expect(
          await request(
            '/catalog/admin/products',
            {
              organizationId: org.id,
              currency: 'COP',
              profile: {
                name: 'Order dog supplies',
                description: 'Complete supplies for companion dogs.',
                categoryId: category.id,
              },
              reason: why,
            },
            staff.headers,
          ),
        );
        const path = '/catalog/admin/products/' + product.id;
        const first = expect(
          await request(
            path + '/variants',
            {
              profile: { sku: 'ORDER-SMALL', priceMinor: 1000 },
              reason: why,
              expectedVersion: 1,
            },
            staff.headers,
          ),
        ).variant;
        const second = expect(
          await request(
            path + '/variants',
            {
              profile: { sku: 'ORDER-LARGE', priceMinor: 2500 },
              reason: why,
              expectedVersion: 2,
            },
            staff.headers,
          ),
        ).variant;
        const sharp = require('sharp'),
          image = await sharp({
            create: {
              width: 100,
              height: 100,
              channels: 3,
              background: 'white',
            },
          })
            .png()
            .toBuffer(),
          form = new FormData();
        form.set(
          'file',
          new Blob([image], { type: 'image/png' }),
          'product.png',
        );
        form.set('reason', why);
        form.set('expectedVersion', '3');
        const photo = await fetch(base + path + '/photos', {
          method: 'POST',
          headers: staff.headers,
          body: form,
        });
        assert.equal(photo.status, 201, await photo.text());
        expect(
          await request(
            path + '/submit',
            { reason: why, expectedVersion: 4 },
            staff.headers,
          ),
        );
        expect(
          await request(
            path + '/review',
            { reason: why, approved: true, expectedVersion: 5 },
            admin,
          ),
        );
        for (const variant of [first, second])
          expect(
            await request(
              '/inventory/variants/' + variant.id + '/movements',
              {
                kind: 'receipt',
                quantity: 20,
                reason: why,
                expectedVersion: 1,
                idempotencyKey: randomUUID(),
              },
              staff.headers,
            ),
          );
        Object.assign(purchase, {
          admin,
          staff,
          buyer,
          other,
          org,
          first,
          second,
          why,
          expect,
          path,
          contact: {
            recipient: 'Buyer Rivera',
            phone: '+573001234568',
            countryCode: 'CO',
            city: 'Bogota',
            address: 'Calle 20 10',
            addressLine2: null,
            postalCode: null,
          },
        });
        assert.equal(
          (await request('/cart', undefined, {}, 'GET')).status,
          401,
        );
        let cart = expect(
          await request('/cart', undefined, buyer.headers, 'GET'),
          200,
        );
        assert.equal(cart.items.length, 0);
        const add = { quantity: 2, expectedVersion: cart.version };
        cart = expect(
          await request('/cart/items/' + first.id, add, buyer.headers, 'PUT'),
          200,
        );
        assert.equal(cart.items[0].quantity, 2);
        assert.equal(cart.current[0].priceMinor, 1000);
        assert.equal(
          (
            await db.inventoryStock.findUnique({
              where: { variantId: first.id },
            })
          ).reserved,
          0,
        );
        assert.equal(
          (await request('/cart/items/' + first.id, add, buyer.headers, 'PUT'))
            .status,
          409,
        );
        assert.equal(
          (
            await request(
              '/cart/items/' + first.id,
              {
                quantity: 2,
                expectedVersion: cart.version,
                buyerId: other.account.id,
              },
              buyer.headers,
              'PUT',
            )
          ).status,
          400,
        );
        cart = expect(
          await request(
            '/cart/items/' + second.id,
            { quantity: 1, expectedVersion: cart.version },
            buyer.headers,
            'PUT',
          ),
          200,
        );
        assert.equal(
          expect(await request('/cart', undefined, other.headers, 'GET'), 200)
            .items.length,
          0,
        );
        assert.equal(
          (
            await request(
              '/cart/items/' + commerce.variantId,
              { quantity: 1, expectedVersion: cart.version },
              buyer.headers,
              'PUT',
            )
          ).status,
          409,
        );
        purchase.cart = cart;
      },
    );
    await t.test(
      'checkout requires explicit commercial policy, coverage and tax configuration',
      async () => {
        const {
            buyer,
            staff,
            other,
            org,
            cart,
            contact,
            why,
            expect,
            first,
            second,
          } = purchase,
          policyPath = '/organizations/' + org.id + '/order-policy';
        const body = {
          expectedCartVersion: cart.version,
          fulfillment: 'delivery',
          contact,
        };
        assert.equal(
          (await request('/checkout/quotes', body, buyer.headers)).status,
          409,
        );
        assert.equal(
          expect(
            await request(policyPath, undefined, staff.headers, 'GET'),
            200,
          ).policy,
          null,
        );
        const policy = {
          expectedVersion: 0,
          reason: why,
          currency: 'COP',
          enabled: true,
          pickupAddress: contact,
          shippingRules: [{ countryCode: 'CO', city: 'Bogota', feeMinor: 500 }],
          taxMode: 'included',
          taxRates: {},
          shippingTaxBasisPoints: 0,
          collector: 'seller',
          terms: 'Delivery in Bogota or pickup at the configured address.',
        };
        assert.equal(
          (await request(policyPath, policy, buyer.headers, 'PUT')).status,
          403,
        );
        assert.equal(
          (await request(policyPath, policy, other.headers, 'PUT')).status,
          403,
        );
        const configured = expect(
          await request(policyPath, policy, staff.headers, 'PUT'),
          200,
        ).policy;
        assert.equal(configured.version, 1);
        assert.equal(
          (await request(policyPath, policy, staff.headers, 'PUT')).status,
          409,
        );
        assert.equal(
          (
            await request(
              '/checkout/quotes',
              { ...body, contact: { ...contact, city: 'Medellin' } },
              buyer.headers,
            )
          ).status,
          409,
        );
        let q = expect(await request('/checkout/quotes', body, buyer.headers));
        assert.equal(q.snapshot.totalMinor, 5000);
        assert.equal(q.snapshot.taxMinor, null);
        assert.equal(
          (
            await db.inventoryStock.findUnique({
              where: { variantId: first.id },
            })
          ).reserved,
          0,
        );
        assert.equal(
          (
            await request(
              '/checkout/quotes/' + q.id,
              undefined,
              other.headers,
              'GET',
            )
          ).status,
          404,
        );
        expect(
          await request(
            policyPath,
            {
              ...policy,
              expectedVersion: 1,
              taxMode: 'added',
              taxRates: { [first.id]: 1900, [second.id]: 500 },
              shippingTaxBasisPoints: 1900,
            },
            staff.headers,
            'PUT',
          ),
          200,
        );
        assert.equal(
          (
            await request(
              '/orders',
              {
                quoteId: q.id,
                expectedTotalMinor: 5000,
                consent: true,
                idempotencyKey: randomUUID(),
              },
              buyer.headers,
            )
          ).status,
          409,
        );
        q = expect(await request('/checkout/quotes', body, buyer.headers));
        assert.equal(q.snapshot.taxMinor, 600);
        assert.equal(q.snapshot.totalMinor, 5600);
        purchase.quote = q;
        purchase.policy = { ...policy, expectedVersion: 2 };
      },
    );
    await t.test(
      'confirmation is atomic, idempotent and cannot silently pay or consume reservations',
      async () => {
        const { buyer, staff, other, org, quote, first, second, expect, why } =
          purchase;
        const data = {
          quoteId: quote.id,
          expectedTotalMinor: quote.snapshot.totalMinor,
          consent: true,
          idempotencyKey: randomUUID(),
        };
        assert.equal(
          (
            await request(
              '/orders',
              { ...data, expectedTotalMinor: 1 },
              buyer.headers,
            )
          ).status,
          409,
        );
        assert.equal(
          (await request('/orders', { ...data, status: 'paid' }, buyer.headers))
            .status,
          400,
        );
        const responses = await Promise.all([
          request('/orders', data, buyer.headers),
          request('/orders', data, buyer.headers),
        ]);
        const order = expect(responses[0]);
        assert.equal(expect(responses[1]).id, order.id);
        assert.equal(order.status, 'awaiting_payment');
        assert.equal('fingerprint' in order, false);
        assert.equal(
          (
            await request(
              '/orders',
              { ...data, expectedTotalMinor: 1 },
              buyer.headers,
            )
          ).status,
          409,
        );
        assert.equal(
          expect(await request('/cart', undefined, buyer.headers, 'GET'), 200)
            .items.length,
          0,
        );
        assert.equal(
          (
            await db.inventoryStock.findUnique({
              where: { variantId: first.id },
            })
          ).reserved,
          2,
        );
        assert.equal(
          (
            await db.inventoryStock.findUnique({
              where: { variantId: second.id },
            })
          ).reserved,
          1,
        );
        assert.equal(
          await db.inventoryHold.count({ where: { orderId: order.id } }),
          2,
        );
        assert.equal(
          (
            await request(
              '/orders/' + order.id,
              undefined,
              other.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/orders?organizationId=' + org.id,
              undefined,
              buyer.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          expect(
            await request(
              '/orders?organizationId=' + org.id,
              undefined,
              staff.headers,
              'GET',
            ),
            200,
          ).items[0].id,
          order.id,
        );
        assert.equal(
          (
            await request(
              '/orders/' + order.id + '/fulfillment',
              { status: 'preparing', expectedVersion: 1, reason: why },
              staff.headers,
              'PATCH',
            )
          ).status,
          409,
        );
        const stock = expect(
          await request(
            '/inventory/variants/' + first.id,
            undefined,
            staff.headers,
            'GET',
          ),
          200,
        );
        const hold = order.snapshot.lines[0].holdId;
        for (const kind of ['consume', 'release'])
          assert.equal(
            (
              await request(
                '/inventory/holds/' + hold + '/' + kind,
                {
                  reason: why,
                  expectedVersion: stock.version,
                  idempotencyKey: randomUUID(),
                },
                staff.headers,
              )
            ).status,
            409,
          );
        await assert.rejects(
          db.order.update({
            where: { id: order.id },
            data: { totalMinor: 1n, version: 2 },
          }),
        );
        await assert.rejects(
          db.inventoryHold.update({
            where: { id: hold },
            data: { orderId: null },
          }),
        );
        purchase.order = order;
      },
    );
    await t.test(
      'unpaid cancellation releases all stock once with immutable private audit history',
      async () => {
        const { buyer, staff, order, first, second, why, expect } = purchase;
        const canceled = expect(
          await request(
            '/orders/' + order.id + '/cancel',
            { expectedVersion: 1, reason: why },
            buyer.headers,
          ),
        );
        assert.equal(canceled.status, 'cancelled');
        for (const variant of [first, second]) {
          const s = await db.inventoryStock.findUnique({
            where: { variantId: variant.id },
          });
          assert.equal(s.reserved, 0);
          assert.equal(s.onHand, 20);
        }
        assert.equal(
          (
            await request(
              '/orders/' + order.id + '/cancel',
              { expectedVersion: 2, reason: why },
              buyer.headers,
            )
          ).status,
          409,
        );
        const audit = expect(
          await request(
            '/orders/' + order.id + '/audits',
            undefined,
            staff.headers,
            'GET',
          ),
          200,
        );
        assert.deepEqual(audit.items.map((a) => a.action).sort(), [
          'cancelled',
          'created',
        ]);
        await assert.rejects(
          db.orderAuditEntry.delete({ where: { id: audit.items[0].id } }),
        );
      },
    );
    const newPurchase = async (fulfillment = 'pickup') => {
      const { buyer, first, second, contact, expect } = purchase;
      let c = expect(
        await request('/cart', undefined, buyer.headers, 'GET'),
        200,
      );
      for (const v of [first, second])
        c = expect(
          await request(
            '/cart/items/' + v.id,
            { quantity: 1, expectedVersion: c.version },
            buyer.headers,
            'PUT',
          ),
          200,
        );
      const q = expect(
        await request(
          '/checkout/quotes',
          { expectedCartVersion: c.version, fulfillment, contact },
          buyer.headers,
        ),
      );
      return {
        cart: c,
        quote: q,
        data: {
          quoteId: q.id,
          expectedTotalMinor: q.snapshot.totalMinor,
          consent: true,
          idempotencyKey: randomUUID(),
        },
      };
    };
    await t.test(
      'failed stock or audit writes roll back order, holds and cart together',
      async () => {
        const { buyer, staff, second, why, expect } = purchase;
        let next = await newPurchase();
        const stock = expect(
          await request(
            '/inventory/variants/' + second.id,
            undefined,
            staff.headers,
            'GET',
          ),
          200,
        );
        expect(
          await request(
            '/inventory/variants/' + second.id + '/movements',
            {
              kind: 'issue',
              quantity: stock.onHand,
              expectedVersion: stock.version,
              idempotencyKey: randomUUID(),
              reason: why,
            },
            staff.headers,
          ),
        );
        assert.equal(
          (await request('/orders', next.data, buyer.headers)).status,
          409,
        );
        assert.equal(
          await db.order.count({ where: { quoteId: next.quote.id } }),
          0,
        );
        assert.equal(
          expect(await request('/cart', undefined, buyer.headers, 'GET'), 200)
            .version,
          next.cart.version,
        );
        expect(
          await request(
            '/inventory/variants/' + second.id + '/movements',
            {
              kind: 'receipt',
              quantity: 20,
              expectedVersion: stock.version + 1,
              idempotencyKey: randomUUID(),
              reason: why,
            },
            staff.headers,
          ),
        );
        next = await newPurchase();
        await db.$executeRawUnsafe(
          "CREATE FUNCTION reject_order_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated order audit failure'; END $$",
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_order_test BEFORE INSERT ON order_audit_entries FOR EACH ROW EXECUTE FUNCTION reject_order_test()',
        );
        try {
          assert.equal(
            (await request('/orders', next.data, buyer.headers)).status,
            500,
          );
          assert.equal(
            await db.order.count({ where: { quoteId: next.quote.id } }),
            0,
          );
          assert.equal(
            await db.inventoryHold.count({
              where: { orderId: { not: null }, status: 'active' },
            }),
            0,
          );
          assert.equal(
            expect(await request('/cart', undefined, buyer.headers, 'GET'), 200)
              .version,
            next.cart.version,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_order_test ON order_audit_entries',
          );
          await db.$executeRawUnsafe('DROP FUNCTION reject_order_test()');
        }
        const order = expect(
          await request('/orders', next.data, buyer.headers),
        );
        purchase.paidOrder = order;
      },
    );
    await t.test(
      'trusted payment requires exact amount and consumes stock atomically before fulfillment',
      async () => {
        const { buyer, staff, paidOrder, first, why, expect } = purchase,
          payment = randomUUID();
        assert.throws(() => systemOrder('settle', paidOrder, payment, 1));
        assert.throws(() =>
          systemOrder(
            'settle',
            paidOrder,
            payment,
            paidOrder.totalMinor,
            'USD',
          ),
        );
        assert.equal(
          (await db.order.findUnique({ where: { id: paidOrder.id } })).status,
          'awaiting_payment',
        );
        await db.$executeRawUnsafe(
          "CREATE FUNCTION reject_payment_order_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated payment audit failure'; END $$",
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_payment_order_test BEFORE INSERT ON order_audit_entries FOR EACH ROW EXECUTE FUNCTION reject_payment_order_test()',
        );
        try {
          assert.throws(() => systemOrder('settle', paidOrder, payment));
          assert.equal(
            (await db.order.findUnique({ where: { id: paidOrder.id } })).status,
            'awaiting_payment',
          );
          assert.equal(
            (
              await db.inventoryStock.findUnique({
                where: { variantId: first.id },
              })
            ).reserved,
            1,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_payment_order_test ON order_audit_entries',
          );
          await db.$executeRawUnsafe(
            'DROP FUNCTION reject_payment_order_test()',
          );
        }
        assert.equal(systemOrder('settle', paidOrder, payment), 'paid');
        assert.equal(systemOrder('settle', paidOrder, payment), 'paid');
        assert.equal(
          (
            await db.inventoryStock.findUnique({
              where: { variantId: first.id },
            })
          ).onHand,
          19,
        );
        assert.equal(
          (
            await request(
              '/orders/' + paidOrder.id + '/cancel',
              { expectedVersion: 2, reason: why },
              buyer.headers,
            )
          ).status,
          409,
        );
        const path = '/orders/' + paidOrder.id + '/fulfillment';
        assert.equal(
          (
            await request(
              path,
              { status: 'preparing', expectedVersion: 2, reason: why },
              buyer.headers,
              'PATCH',
            )
          ).status,
          403,
        );
        let current = expect(
          await request(
            path,
            { status: 'preparing', expectedVersion: 2, reason: why },
            staff.headers,
            'PATCH',
          ),
          200,
        );
        assert.equal(
          (
            await request(
              path,
              {
                status: 'dispatched',
                expectedVersion: current.version,
                reason: why,
              },
              staff.headers,
              'PATCH',
            )
          ).status,
          409,
        );
        current = expect(
          await request(
            path,
            {
              status: 'ready_for_pickup',
              expectedVersion: current.version,
              reason: why,
            },
            staff.headers,
            'PATCH',
          ),
          200,
        );
        current = expect(
          await request(
            path,
            {
              status: 'delivered',
              expectedVersion: current.version,
              reason: why,
            },
            staff.headers,
            'PATCH',
          ),
          200,
        );
        assert.equal(current.status, 'delivered');
        assert.equal(systemOrder('settle', paidOrder, payment), 'delivered');
        assert.equal(
          await db.orderAuditEntry.count({
            where: { orderId: paidOrder.id, action: 'paid' },
          }),
          1,
        );
      },
    );
    await t.test(
      'unpaid deadlines recover stock exactly once and reject late payment',
      async () => {
        const { buyer, first, expect } = purchase,
          next = await newPurchase('delivery'),
          order = expect(await request('/orders', next.data, buyer.headers));
        const future = new Date(
          Date.parse(order.expiresAt) + 1000,
        ).toISOString();
        assert.equal(
          systemOrder('expire', order, undefined, undefined, undefined, future),
          'expired',
        );
        assert.equal(
          systemOrder('expire', order, undefined, undefined, undefined, future),
          'expired',
        );
        assert.equal(
          (await db.order.findUnique({ where: { id: order.id } })).status,
          'expired',
        );
        assert.equal(
          (
            await db.inventoryStock.findUnique({
              where: { variantId: first.id },
            })
          ).reserved,
          0,
        );
        assert.equal(
          await db.orderAuditEntry.count({
            where: { orderId: order.id, action: 'expired' },
          }),
          1,
        );
        assert.throws(() => systemOrder('settle', order));
        assert.equal(
          expect(
            await request(
              '/orders/' + order.id,
              undefined,
              buyer.headers,
              'GET',
            ),
            200,
          ).status,
          'expired',
        );
      },
    );

    const systemPayment = (
      mode,
      paymentId,
      eventId = randomUUID(),
      time = '',
    ) =>
      execFileSync(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/testing/payment-system-port.ts',
          mode,
          paymentId,
          eventId,
          time,
        ],
        {
          env: process.env,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      ).trim();
    const paymentPurchase = async () => {
      await resetRate();
      const next = await newPurchase(),
        order = purchase.expect(
          await request('/orders', next.data, purchase.buyer.headers),
        );
      const payment = purchase.expect(
        await request(
          `/orders/${order.id}/payment-attempts`,
          { idempotencyKey: randomUUID() },
          purchase.buyer.headers,
        ),
      );
      return { order, payment };
    };
    await t.test(
      'Payments enforce ownership, immutable accepted commission, concurrency and strict HTTP contracts',
      async () => {
        const { buyer, other, staff, admin, org, expect } = purchase;
        await resetRate();
        const next = await newPurchase(),
          order = expect(await request('/orders', next.data, buyer.headers));
        assert.equal(next.quote.snapshot.commission.rateBasisPoints, 1000);
        assert.equal(
          Date.parse(order.expiresAt) - Date.parse(order.createdAt),
          1800000,
        );
        const body = { idempotencyKey: randomUUID() },
          path = `/orders/${order.id}/payment-attempts`;
        assert.equal((await request(path, body, other.headers)).status, 404);
        assert.equal(
          (await request(path, { ...body, amountMinor: 1 }, buyer.headers))
            .status,
          400,
        );
        const [a, b] = await Promise.all([
          request(path, body, buyer.headers),
          request(path, body, buyer.headers),
        ]);
        const payment = expect(a);
        assert.equal(expect(b).id, payment.id);
        assert.deepEqual(payment.allocation, order.snapshot.commission);
        assert.equal(payment.checkoutUrl, null);
        assert.equal(payment.status, 'created');
        assert.equal(payment.feeMinor, null);
        assert.equal(
          (await request(path, { idempotencyKey: randomUUID() }, buyer.headers))
            .status,
          409,
        );
        assert.equal(
          (
            await request(
              '/payments/' + payment.id,
              undefined,
              other.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/payments?scope=platform',
              undefined,
              buyer.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          expect(
            await request(
              '/payments?organizationId=' + org.id,
              undefined,
              staff.headers,
              'GET',
            ),
            200,
          ).items.some((p) => p.id === payment.id),
          true,
        );
        assert.equal(
          (
            await request(
              '/payments/' + payment.id + '/financials',
              undefined,
              buyer.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (await request('/payments/' + payment.id + '/reconcile', {}, admin))
            .status,
          503,
        );
        assert.equal(
          expect(
            await request('/payments/policy', undefined, buyer.headers, 'GET'),
            200,
          ).providerEnabled,
          false,
        );
        assert.equal(
          await db.paymentAttempt.count({ where: { orderId: order.id } }),
          1,
        );
        assert.equal(
          await db.paymentOutboxJob.count({ where: { paymentId: payment.id } }),
          1,
        );
        await assert.rejects(
          db.paymentAttempt.update({
            where: { id: payment.id },
            data: { allocation: { ...payment.allocation, rateBasisPoints: 0 } },
          }),
        );
        expect(
          await request(
            '/orders/' + order.id + '/cancel',
            { expectedVersion: 1, reason: purchase.why },
            buyer.headers,
          ),
        );
        purchase.paymentSample = payment;
      },
    );
    await t.test(
      'Payments outbox and audit failures roll back attempts and authoritative capture atomically',
      async () => {
        const { buyer, expect } = purchase;
        await resetRate();
        const next = await newPurchase(),
          order = expect(await request('/orders', next.data, buyer.headers));
        await db.$executeRawUnsafe(
          "CREATE FUNCTION reject_payment_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated payment failure'; END $$",
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_payment_test BEFORE INSERT ON payment_outbox_jobs FOR EACH ROW EXECUTE FUNCTION reject_payment_test()',
        );
        try {
          assert.equal(
            (
              await request(
                `/orders/${order.id}/payment-attempts`,
                { idempotencyKey: randomUUID() },
                buyer.headers,
              )
            ).status,
            500,
          );
          assert.equal(
            await db.paymentAttempt.count({ where: { orderId: order.id } }),
            0,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_payment_test ON payment_outbox_jobs',
          );
        }
        const payment = expect(
          await request(
            `/orders/${order.id}/payment-attempts`,
            { idempotencyKey: randomUUID() },
            buyer.headers,
          ),
        );
        assert.equal(
          systemPayment('pending', payment.id, 'pending-' + payment.id),
          'pending',
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_payment_test BEFORE INSERT ON payment_ledger_entries FOR EACH ROW EXECUTE FUNCTION reject_payment_test()',
        );
        try {
          assert.equal(
            systemPayment('approved', payment.id, 'approval-' + payment.id),
            'pending',
          );
          assert.equal(
            (await db.order.findUnique({ where: { id: order.id } })).status,
            'awaiting_payment',
          );
          assert.equal(
            await db.paymentLedgerEntry.count({
              where: { paymentId: payment.id },
            }),
            0,
          );
          assert.equal(
            await db.paymentProviderEvent.count({
              where: {
                paymentId: payment.id,
                eventId: 'approval-' + payment.id,
              },
            }),
            0,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_payment_test ON payment_ledger_entries',
          );
          await db.$executeRawUnsafe('DROP FUNCTION reject_payment_test()');
        }
        assert.equal(
          systemPayment('approved', payment.id, 'approval-' + payment.id),
          'approved',
        );
        assert.equal(
          systemPayment('approved', payment.id, 'approval-' + payment.id),
          'approved',
        );
        assert.equal(
          systemPayment(
            'distributed',
            payment.id,
            'distribution-' + payment.id,
          ),
          'approved',
        );
        const recorded = await db.paymentAttempt.findUnique({
          where: { id: payment.id },
        });
        assert.equal(recorded.distributionStatus, 'distributed');
        assert.equal(Number(recorded.feeMinor), 250);
        assert.equal(
          await db.paymentLedgerEntry.count({
            where: { paymentId: payment.id },
          }),
          1,
        );
        assert.equal(
          await db.orderAuditEntry.count({
            where: { orderId: order.id, action: 'paid' },
          }),
          1,
        );
        const ledger = await db.paymentLedgerEntry.findFirst({
          where: { paymentId: payment.id },
        });
        await assert.rejects(
          db.paymentLedgerEntry.delete({ where: { id: ledger.id } }),
        );
        const event = await db.paymentProviderEvent.findFirst({
          where: { paymentId: payment.id },
        });
        await assert.rejects(
          db.paymentProviderEvent.update({
            where: { id: event.id },
            data: { outcome: 'ignored' },
          }),
        );
        const evidence = expect(
          await request(
            '/payments/' + payment.id + '/financials',
            undefined,
            purchase.admin,
            'GET',
          ),
          200,
        );
        assert.equal(evidence.ledger.length, 1);
        assert.equal(
          evidence.events.some((e) => e.fingerprint !== undefined),
          false,
        );
      },
    );
    await t.test(
      'Payments reconcile mismatches and late collected funds without reviving expired orders',
      async () => {
        const { buyer, expect, why } = purchase;
        const mismatch = await paymentPurchase();
        assert.equal(
          systemPayment(
            'mismatch',
            mismatch.payment.id,
            'mismatch-' + mismatch.payment.id,
          ),
          'reconciliation_required',
        );
        assert.equal(
          (await db.order.findUnique({ where: { id: mismatch.order.id } }))
            .status,
          'awaiting_payment',
        );
        assert.equal(
          await db.paymentLedgerEntry.count({
            where: { paymentId: mismatch.payment.id },
          }),
          0,
        );
        assert.equal(
          (
            await request(
              `/orders/${mismatch.order.id}/payment-attempts`,
              { idempotencyKey: randomUUID() },
              buyer.headers,
            )
          ).status,
          409,
        );
        expect(
          await request(
            '/orders/' + mismatch.order.id + '/cancel',
            { expectedVersion: 1, reason: why },
            buyer.headers,
          ),
        );
        const late = await paymentPurchase();
        assert.equal(
          systemPayment(
            'pending',
            late.payment.id,
            'pending-' + late.payment.id,
          ),
          'pending',
        );
        const future = new Date(
          Date.parse(late.order.expiresAt) + 1000,
        ).toISOString();
        systemOrder(
          'expire',
          late.order,
          undefined,
          undefined,
          undefined,
          future,
        );
        assert.equal(
          systemPayment(
            'approved',
            late.payment.id,
            'late-' + late.payment.id,
            future,
          ),
          'reconciliation_required',
        );
        assert.equal(
          (await db.order.findUnique({ where: { id: late.order.id } })).status,
          'expired',
        );
        assert.equal(
          await db.paymentLedgerEntry.count({
            where: { paymentId: late.payment.id },
          }),
          1,
        );
        assert.equal(
          await db.inventoryHold.count({
            where: { orderId: late.order.id, status: 'consumed' },
          }),
          0,
        );
      },
    );
    await t.test(
      'Payments recover an ambiguous checkout through lookup and expire unsubmitted disabled attempts',
      async () => {
        const ambiguous = await paymentPurchase();
        assert.equal(
          systemPayment(
            'timeout',
            ambiguous.payment.id,
            'ambiguous-' + ambiguous.payment.id,
          ),
          'approved',
        );
        assert.equal(
          await db.paymentLedgerEntry.count({
            where: { paymentId: ambiguous.payment.id },
          }),
          1,
        );
        const neverSubmitted = await paymentPurchase(),
          future = new Date(
            Date.parse(neverSubmitted.order.expiresAt) + 1000,
          ).toISOString();
        assert.equal(
          systemPayment(
            'approved',
            neverSubmitted.payment.id,
            'unused-' + neverSubmitted.payment.id,
            future,
          ),
          'expired',
        );
        assert.equal(
          await db.paymentProviderEvent.count({
            where: { paymentId: neverSubmitted.payment.id },
          }),
          0,
        );
        systemOrder(
          'expire',
          neverSubmitted.order,
          undefined,
          undefined,
          undefined,
          future,
        );
        assert.equal(
          await db.inventoryHold.count({
            where: { orderId: neverSubmitted.order.id, status: 'active' },
          }),
          0,
        );
      },
    );

    await t.test(
      'commercial revisions, operator permissions, price changes and suspended buyer history stay consistent',
      async () => {
        const {
          admin,
          staff,
          buyer,
          other,
          org,
          first,
          path,
          why,
          expect,
          paidOrder,
        } = purchase;
        const policyPath = '/organizations/' + org.id + '/order-policy';
        const history = expect(
          await request(
            policyPath + '/audits',
            undefined,
            staff.headers,
            'GET',
          ),
          200,
        );
        assert.equal(history.total, 2);
        assert.deepEqual(
          history.items.map((a) => a.version),
          [2, 1],
        );
        assert.equal(history.items[0].snapshot.taxMode, 'added');
        await assert.rejects(
          db.orderPolicyAuditEntry.update({
            where: { id: history.items[0].id },
            data: { reason: 'Changed tax revision history.' },
          }),
        );
        expect(
          await request(
            `/organizations/${org.id}/members/${other.account.id}/role`,
            { role: 'business_operator', reason: why },
            admin,
            'PUT',
          ),
          200,
        );
        assert.equal(
          (await request(policyPath, undefined, other.headers, 'GET')).status,
          403,
        );
        expect(
          await request(
            '/orders?organizationId=' + org.id,
            undefined,
            other.headers,
            'GET',
          ),
          200,
        );
        let next = await newPurchase();
        const current = expect(
          await request(path, undefined, staff.headers, 'GET'),
          200,
        );
        expect(
          await request(
            path + '/variants/' + first.id,
            {
              profile: { priceMinor: 1500 },
              reason: why,
              expectedVersion: current.product.version,
            },
            staff.headers,
            'PATCH',
          ),
          200,
        );
        assert.equal(
          (await request('/orders', next.data, buyer.headers)).status,
          409,
        );
        const changed = expect(
          await request(path, undefined, staff.headers, 'GET'),
          200,
        );
        expect(
          await request(
            path + '/submit',
            { reason: why, expectedVersion: changed.product.version },
            staff.headers,
          ),
        );
        expect(
          await request(
            path + '/review',
            {
              approved: true,
              reason: why,
              expectedVersion: changed.product.version + 1,
            },
            admin,
          ),
        );
        assert.equal(
          (await request('/orders', next.data, buyer.headers)).status,
          409,
        );
        next = await newPurchase();
        assert.equal(
          next.quote.snapshot.lines.find((l) => l.variantId === first.id)
            .unitPriceMinor,
          1500,
        );
        const order = expect(
          await request('/orders', next.data, buyer.headers),
        );
        assert.equal(
          (
            await db.order.findUnique({ where: { id: paidOrder.id } })
          ).snapshot.lines.find((l) => l.variantId === first.id).unitPriceMinor,
          1000,
        );
        const seller = await db.organization.findUnique({
          where: { id: org.id },
        });
        expect(
          await request(
            '/organizations/' + org.id + '/status',
            {
              status: 'suspended',
              reason: why,
              expectedVersion: seller.version,
            },
            admin,
            'PATCH',
          ),
          200,
        );
        assert.equal(
          (
            await request(
              '/orders/' + order.id,
              undefined,
              staff.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          expect(
            await request(
              '/orders/' + order.id,
              undefined,
              buyer.headers,
              'GET',
            ),
            200,
          ).status,
          'awaiting_payment',
        );
        assert.equal(
          expect(
            await request(
              '/orders/' + order.id + '/cancel',
              { expectedVersion: 1, reason: why },
              buyer.headers,
            ),
          ).status,
          'cancelled',
        );
        assert.equal(
          (
            await db.inventoryStock.findUnique({
              where: { variantId: first.id },
            })
          ).reserved,
          0,
        );
      },
    );
    const scheduling = {};
    await t.test(
      'services enforce business scope, real calendars, independent moderation and private/public DTOs',
      async () => {
        const admin = bearer((await adminLogin()).accessToken),
          staff = await createAccount('service-staff@example.com', admin),
          buyer = await createAccount('service-buyer@example.com', admin),
          other = await createAccount('service-other@example.com', admin);
        const why = 'Service calendar and accepted conditions verified.';
        const expect = (r, status = 201) => {
          assert.equal(r.status, status, JSON.stringify(r.body));
          return r.body;
        };
        const org = expect(
          await request(
            '/organizations',
            {
              name: 'Booking provider',
              type: 'business',
              profile: {
                legalName: 'Booking Provider SAS',
                registrationNumber: '901777222',
                email: 'services@example.com',
                phone: '+573001234567',
                countryCode: 'CO',
                city: 'Bogota',
                address: 'Carrera 20 10',
              },
              reason: why,
            },
            admin,
          ),
        );
        expect(
          await request(
            `/organizations/${org.id}/submit`,
            { reason: why, expectedVersion: 1 },
            admin,
          ),
        );
        expect(
          await request(
            `/organizations/${org.id}/approve`,
            {
              reason: why,
              expectedVersion: 2,
              responsibleUserId: staff.account.id,
            },
            admin,
          ),
        );
        const resourceProfile = {
          name: 'Grooming team',
          kind: 'appointment',
          capacity: 2,
          status: 'active',
          windows: Array.from({ length: 7 }, (_, i) => ({
            day: i + 1,
            startMinute: 480,
            endMinute: 1080,
          })),
        };
        assert.equal(
          (
            await request(
              '/services/admin/resources',
              { organizationId: org.id, profile: resourceProfile, reason: why },
              buyer.headers,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/services/admin/resources',
              {
                organizationId: org.id,
                profile: {
                  ...resourceProfile,
                  windows: [{ day: 1, startMinute: 7, endMinute: 600 }],
                },
                reason: why,
              },
              staff.headers,
            )
          ).status,
          400,
        );
        const resource = expect(
          await request(
            '/services/admin/resources',
            { organizationId: org.id, profile: resourceProfile, reason: why },
            staff.headers,
          ),
        );
        const profile = {
          name: 'Professional grooming',
          description: 'Professional grooming for companion dogs.',
          category: 'grooming',
          kind: 'appointment',
          priceMinor: 3500000,
          currency: 'COP',
          acceptedSpecies: ['dog'],
          requirements: 'Bring vaccination record.',
          terms: 'Cancel at least one hour before the appointment.',
          collectionMode: 'pay_at_business',
          confirmationMode: 'automatic',
          durationMinutes: 60,
          bufferBeforeMinutes: 15,
          bufferAfterMinutes: 15,
          checkInMinute: null,
          checkOutMinute: null,
          minNights: 1,
          maxNights: 1,
          minimumNoticeMinutes: 60,
          cancellationCutoffMinutes: 60,
          requestTtlMinutes: 60,
          resourceIds: [resource.id],
        };
        const create = async (patch) => {
          const service = expect(
            await request(
              '/services/admin',
              {
                organizationId: org.id,
                profile: { ...profile, ...patch },
                reason: why,
              },
              staff.headers,
            ),
          );
          assert.equal(
            (await request('/services/' + service.id, undefined, {}, 'GET'))
              .status,
            404,
          );
          expect(
            await request(
              '/services/admin/' + service.id + '/submit',
              { expectedVersion: 1, reason: why },
              staff.headers,
            ),
            200,
          );
          assert.equal(
            (
              await request(
                '/services/admin/' + service.id + '/review',
                { expectedVersion: 2, approved: true, reason: why },
                staff.headers,
              )
            ).status,
            403,
          );
          const queue = expect(
            await request(
              '/services/admin/moderation?limit=50',
              undefined,
              admin,
              'GET',
            ),
            200,
          );
          assert.ok(queue.items.some((s) => s.id === service.id));
          assert.equal(
            expect(
              await request(
                '/services/admin/moderation/' + service.id,
                undefined,
                admin,
                'GET',
              ),
              200,
            ).status,
            'pending',
          );
          assert.equal(
            (
              await request(
                '/services/admin/moderation',
                undefined,
                buyer.headers,
                'GET',
              )
            ).status,
            403,
          );
          return expect(
            await request(
              '/services/admin/' + service.id + '/review',
              { expectedVersion: 2, approved: true, reason: why },
              admin,
            ),
            200,
          );
        };
        const service = await create({});
        const publicService = expect(
          await request('/services/' + service.id, undefined, {}, 'GET'),
          200,
        );
        assert.equal(publicService.priceMinor, 3500000);
        const resources = expect(
          await request(
            '/services/' + service.id + '/resources',
            undefined,
            {},
            'GET',
          ),
          200,
        );
        assert.equal(resources.items[0].id, resource.id);
        assert.equal(resources.items[0].capacity, 2);
        assert.equal('createdBy' in publicService, false);
        assert.equal('reviewReason' in publicService, false);
        assert.equal(
          (
            await request(
              '/services/admin/' + service.id,
              undefined,
              buyer.headers,
              'GET',
            )
          ).status,
          403,
        );
        const pets = [];
        for (let i = 0; i < 3; i++)
          pets.push(
            expect(
              await request(
                '/animals',
                {
                  profile: {
                    name: 'Booking dog ' + i,
                    species: 'dog',
                    healthNotes: 'DO_NOT_SHARE_HEALTH',
                  },
                  reason: why,
                },
                buyer.headers,
              ),
            ),
          );
        const alien = expect(
          await request(
            '/animals',
            { profile: { name: 'Other dog', species: 'dog' }, reason: why },
            other.headers,
          ),
        );
        const day = new Date(Date.now() + 3 * 86400000)
            .toISOString()
            .slice(0, 10),
          availability = expect(
            await request(
              `/services/${service.id}/availability?resourceId=${resource.id}&from=${day}&to=${day}`,
              undefined,
              {},
              'GET',
            ),
            200,
          );
        assert.ok(availability.slots.length > 0);
        assert.equal(availability.slots[0].remaining, 2);
        assert.equal(
          (
            await request(
              `/services/${service.id}/availability?resourceId=${resource.id}&from=${day}&to=2099-12-31`,
              undefined,
              {},
              'GET',
            )
          ).status,
          400,
        );
        const body = (
          pet = pets[0],
          slot = availability.slots[0],
          extra = {},
        ) => ({
          serviceId: service.id,
          animalId: pet.id,
          resourceId: resource.id,
          idempotencyKey: randomUUID(),
          expectedServiceVersion: 3,
          expectedResourceVersion: 1,
          expectedTotalMinor: 3500000,
          slot: { kind: 'appointment', startsAt: slot.startsAt },
          contact: { name: 'Booking customer', phone: '+573001234567' },
          consent: true,
          ...extra,
        });
        Object.assign(scheduling, {
          admin,
          staff,
          buyer,
          other,
          org,
          resource,
          resourceProfile,
          profile,
          service,
          pets,
          alien,
          day,
          availability,
          body,
          create,
          why,
          expect,
        });
      },
    );
    await t.test(
      'booking capacity, pet conflicts and idempotent replay survive concurrent requests',
      async () => {
        const {
          body,
          pets,
          buyer,
          other,
          alien,
          expect,
          service,
          resource,
          day,
        } = scheduling;
        assert.equal(
          (await request('/bookings', body(alien), buyer.headers)).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/bookings',
              { ...body(), status: 'confirmed' },
              buyer.headers,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              '/bookings',
              body(pets[0], undefined, { expectedTotalMinor: 1 }),
              buyer.headers,
            )
          ).status,
          409,
        );
        await db.$executeRawUnsafe(
          `CREATE FUNCTION reject_booking_mail_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."subjectType"='booking' THEN RAISE EXCEPTION 'Simulated booking mail failure'; END IF; RETURN NEW; END $$`,
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_booking_mail_test BEFORE INSERT ON notification_outbox FOR EACH ROW EXECUTE FUNCTION reject_booking_mail_test()',
        );
        try {
          assert.equal(
            (await request('/bookings', body(), buyer.headers)).status,
            500,
          );
          assert.equal(
            await db.bookingRecord.count({
              where: { buyerId: buyer.account.id },
            }),
            0,
          );
          assert.equal(await db.bookingAuditEntry.count(), 0);
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_booking_mail_test ON notification_outbox',
          );
          await db.$executeRawUnsafe(
            'DROP FUNCTION reject_booking_mail_test()',
          );
        }
        const key = body();
        const replay = await Promise.all([
          request('/bookings', key, buyer.headers),
          request('/bookings', key, buyer.headers),
        ]);
        assert.equal(replay[0].status, 201, JSON.stringify(replay[0].body));
        assert.equal(replay[1].status, 201, JSON.stringify(replay[1].body));
        assert.equal(replay[0].body.id, replay[1].body.id);
        const first = replay[0].body;
        assert.equal(
          JSON.stringify(first).includes('DO_NOT_SHARE_HEALTH'),
          false,
        );
        assert.equal('fingerprint' in first, false);
        assert.equal(
          await db.bookingRecord.count({
            where: {
              buyerId: buyer.account.id,
              idempotencyKey: key.idempotencyKey,
            },
          }),
          1,
        );
        assert.equal(
          await db.bookingAuditEntry.count({ where: { bookingId: first.id } }),
          1,
        );
        assert.equal(
          (
            await request(
              '/bookings',
              {
                ...key,
                contact: { ...key.contact, name: 'Different contact' },
              },
              buyer.headers,
            )
          ).status,
          409,
        );
        assert.equal(
          (await request('/bookings', body(), buyer.headers)).status,
          409,
        );
        const races = await Promise.all([
          request('/bookings', body(pets[1]), buyer.headers),
          request('/bookings', body(pets[2]), buyer.headers),
        ]);
        assert.deepEqual(races.map((r) => r.status).sort(), [201, 409]);
        const second = races.find((r) => r.status === 201).body;
        assert.equal(
          (
            await request(
              '/bookings/' + first.id,
              undefined,
              other.headers,
              'GET',
            )
          ).status,
          403,
        );
        const remaining = expect(
          await request(
            `/services/${service.id}/availability?resourceId=${resource.id}&from=${day}&to=${day}`,
            undefined,
            {},
            'GET',
          ),
          200,
        );
        assert.ok(!remaining.slots.some((s) => s.startsAt === first.startsAt));
        const own = expect(
          await request('/bookings', undefined, buyer.headers, 'GET'),
          200,
        );
        assert.equal(own.total, 2);
        const messages = await db.outboxMessage.findMany({
          where: { subjectId: first.id, subjectType: 'booking' },
        });
        assert.equal(messages.length, 3);
        assert.equal(
          messages.filter((m) => m.notBefore > new Date()).length,
          2,
        );
        assert.ok(
          messages.every((m) =>
            m.deliveredAt
              ? m.encryptedPayload === null
              : Boolean(m.encryptedPayload),
          ),
        );
        Object.assign(scheduling, { first, second, key });
      },
    );
    await t.test(
      'calendar and block mutations protect occupied bookings; cancelled blocks retain audit and stale versions fail',
      async () => {
        const { staff, resource, org, resourceProfile, why, expect, first } =
          scheduling;
        assert.equal(
          (
            await request(
              '/services/admin/resources/' + resource.id,
              {
                organizationId: org.id,
                profile: { ...resourceProfile, capacity: 1 },
                expectedVersion: 1,
                reason: why,
              },
              staff.headers,
              'PATCH',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              `/services/admin/resources/${resource.id}/blocks`,
              {
                startsAt: first.occupiedStartsAt,
                endsAt: first.occupiedEndsAt,
                expectedVersion: 1,
                reason: why,
              },
              staff.headers,
            )
          ).status,
          409,
        );
        const startsAt = new Date(
            Date.parse(first.startsAt) + 4 * 3600000,
          ).toISOString(),
          endsAt = new Date(
            Date.parse(first.startsAt) + 5 * 3600000,
          ).toISOString();
        const block = expect(
          await request(
            `/services/admin/resources/${resource.id}/blocks`,
            { startsAt, endsAt, expectedVersion: 1, reason: why },
            staff.headers,
          ),
        );
        assert.equal(
          (
            await request(
              `/services/admin/resources/${resource.id}/blocks/${block.id}`,
              { expectedVersion: 1, reason: why },
              staff.headers,
              'DELETE',
            )
          ).status,
          409,
        );
        const from = new Date(Date.now() + 60000).toISOString(),
          to = new Date(Date.now() + 10 * 86400000).toISOString();
        const blocks = expect(
          await request(
            `/services/admin/resources/${resource.id}/blocks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            undefined,
            staff.headers,
            'GET',
          ),
          200,
        );
        assert.ok(blocks.items.some((b) => b.id === block.id));
        const released = expect(
          await request(
            `/services/admin/resources/${resource.id}/blocks/${block.id}`,
            { expectedVersion: 2, reason: why },
            staff.headers,
            'DELETE',
          ),
          200,
        );
        assert.ok(released.releasedAt);
        scheduling.resource.version = 3;
        const listed = expect(
          await request(
            '/services/admin/resources?organizationId=' + org.id,
            undefined,
            staff.headers,
            'GET',
          ),
          200,
        );
        assert.equal(listed.items[0].version, 3);
        await assert.rejects(
          db.serviceBlock.delete({ where: { id: block.id } }),
        );
      },
    );
    await t.test(
      'rescheduling and cancellation are atomic, preserve accepted revisions and replace queued reminders',
      async () => {
        const {
          first,
          second,
          buyer,
          staff,
          expect,
          why,
          body,
          resource,
          service,
          org,
          profile,
          pets,
        } = scheduling;
        const before = await db.bookingAuditEntry.count({
          where: { bookingId: first.id },
        });
        const target = {
          startsAt: new Date(
            Date.parse(first.startsAt) + 3 * 3600000,
          ).toISOString(),
        };
        const { serviceId, animalId, idempotencyKey, ...selection } = body(
          pets[0],
          target,
          { expectedResourceVersion: resource.version },
        );
        void serviceId;
        void animalId;
        void idempotencyKey;
        await db.$executeRawUnsafe(
          `CREATE FUNCTION reject_booking_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated booking audit failure'; END $$`,
        );
        await db.$executeRawUnsafe(
          'CREATE TRIGGER reject_booking_audit_test BEFORE INSERT ON booking_audit FOR EACH ROW EXECUTE FUNCTION reject_booking_audit_test()',
        );
        try {
          assert.equal(
            (
              await request(
                '/bookings/' + first.id + '/reschedule',
                { ...selection, expectedVersion: 1, reason: why },
                buyer.headers,
              )
            ).status,
            500,
          );
          assert.equal(
            (await db.bookingRecord.findUnique({ where: { id: first.id } }))
              .version,
            1,
          );
          assert.equal(
            await db.bookingAuditEntry.count({
              where: { bookingId: first.id },
            }),
            before,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_booking_audit_test ON booking_audit',
          );
          await db.$executeRawUnsafe(
            'DROP FUNCTION reject_booking_audit_test()',
          );
        }
        const changed = expect(
          await request(
            '/bookings/' + first.id + '/reschedule',
            { ...selection, expectedVersion: 1, reason: why },
            buyer.headers,
          ),
          200,
        );
        assert.equal(changed.id, first.id);
        assert.equal(changed.version, 2);
        assert.equal(changed.status, 'confirmed');
        assert.equal(changed.startsAt, target.startsAt);
        const oldMessages = await db.outboxMessage.findMany({
          where: { subjectId: first.id, subjectVersion: 1 },
        });
        assert.ok(
          oldMessages
            .filter((m) => !m.deliveredAt)
            .every((m) => m.failedAt && m.encryptedPayload === null),
        );
        const edited = expect(
          await request(
            '/services/admin/' + service.id,
            {
              organizationId: org.id,
              profile: {
                ...profile,
                priceMinor: 4500000,
                terms: 'New service conditions must be accepted.',
              },
              expectedVersion: 3,
              reason: why,
            },
            staff.headers,
            'PATCH',
          ),
          200,
        );
        assert.equal(edited.status, 'draft');
        const accepted = expect(
          await request(
            '/bookings/' + second.id,
            undefined,
            buyer.headers,
            'GET',
          ),
          200,
        );
        assert.equal(accepted.acceptance.totalMinor, 3500000);
        assert.equal(accepted.acceptance.service.terms, profile.terms);
        assert.equal(
          (
            await request(
              '/bookings',
              body(pets[2], target, { expectedResourceVersion: 3 }),
              buyer.headers,
            )
          ).status,
          404,
        );
        const cancelled = expect(
          await request(
            '/bookings/' + first.id + '/cancel',
            { expectedVersion: 2, reason: why },
            buyer.headers,
          ),
          200,
        );
        assert.equal(cancelled.status, 'cancelled');
        assert.equal(
          (
            await request(
              '/bookings/' + first.id + '/cancel',
              { expectedVersion: 2, reason: why },
              buyer.headers,
            )
          ).status,
          409,
        );
        const history = expect(
          await request(
            '/bookings/' + first.id + '/audit',
            undefined,
            buyer.headers,
            'GET',
          ),
          200,
        );
        assert.equal(history.total, 3);
        assert.ok(history.items.some((a) => a.action === 'rescheduled'));
        await assert.rejects(
          db.bookingAuditEntry.update({
            where: { id: history.items[0].id },
            data: { reason: 'Changed customer history.' },
          }),
        );
        scheduling.first = cancelled;
      },
    );
    await t.test(
      'manual booking decisions, expiry, scheduled mail and lodging nights use real persisted contracts',
      async () => {
        const {
          create,
          staff,
          buyer,
          other,
          org,
          pets,
          resource,
          why,
          expect,
          day,
        } = scheduling;
        const manual = await create({
          confirmationMode: 'manual',
          resourceIds: [resource.id],
        });
        const availability = expect(
          await request(
            `/services/${manual.id}/availability?resourceId=${resource.id}&from=${day}&to=${day}`,
            undefined,
            {},
            'GET',
          ),
          200,
        );
        const slot = availability.slots.at(-1);
        const payload = {
          serviceId: manual.id,
          animalId: pets[0].id,
          resourceId: resource.id,
          idempotencyKey: randomUUID(),
          expectedServiceVersion: 3,
          expectedResourceVersion: 3,
          expectedTotalMinor: 3500000,
          slot: { kind: 'appointment', startsAt: slot.startsAt },
          contact: { name: 'Client', phone: '+573001234567' },
          consent: true,
        };
        const pending = expect(
          await request('/bookings', payload, buyer.headers),
        );
        assert.equal(pending.status, 'requested');
        assert.ok(pending.expiresAt);
        assert.equal(
          (
            await request(
              '/bookings/admin/' + pending.id + '/confirm',
              { expectedVersion: 1, reason: why },
              other.headers,
            )
          ).status,
          403,
        );
        const confirmed = expect(
          await request(
            '/bookings/admin/' + pending.id + '/confirm',
            { expectedVersion: 1, reason: why },
            staff.headers,
          ),
          200,
        );
        assert.equal(confirmed.status, 'confirmed');
        assert.equal(confirmed.expiresAt, null);
        const reminder = await db.outboxMessage.findFirst({
          where: {
            subjectId: pending.id,
            subjectVersion: 2,
            notBefore: { gt: new Date() },
            failedAt: null,
          },
        });
        assert.ok(reminder);
        await db.outboxMessage.update({
          where: { id: reminder.id },
          data: { notBefore: new Date(Date.now() - 1000) },
        });
        const deadline = Date.now() + 12000;
        let delivered = null;
        while (Date.now() < deadline) {
          delivered = await db.outboxMessage.findUnique({
            where: { id: reminder.id },
          });
          if (delivered.deliveredAt) break;
          await new Promise((r) => setTimeout(r, 200));
        }
        assert.ok(delivered.deliveredAt);
        assert.equal(delivered.encryptedPayload, null);
        const mails = await (await fetch(mail + '/api/v1/messages')).json();
        assert.ok(
          mails.messages.some(
            (m) =>
              m.Subject.includes('Recordatorio') &&
              m.To.some((a) => a.Address === 'service-buyer@example.com'),
          ),
        );
        const rejectedPending = expect(
          await request(
            '/bookings',
            { ...payload, animalId: pets[2].id, idempotencyKey: randomUUID() },
            buyer.headers,
          ),
        );
        assert.equal(
          expect(
            await request(
              '/bookings/admin/' + rejectedPending.id + '/reject',
              { expectedVersion: 1, reason: why },
              staff.headers,
            ),
            200,
          ).status,
          'rejected',
        );
        const expiring = expect(
          await request(
            '/bookings',
            { ...payload, animalId: pets[2].id, idempotencyKey: randomUUID() },
            buyer.headers,
          ),
        );
        const expired = JSON.parse(
          execFileSync(
            process.execPath,
            [
              '--import',
              'tsx',
              'scripts/testing/booking-system-port.ts',
              'expire',
              expiring.id,
              new Date(Date.parse(expiring.expiresAt) + 1000).toISOString(),
            ],
            {
              env: process.env,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe'],
            },
          ),
        );
        assert.equal(expired.status, 'expired');
        assert.equal(
          (await db.bookingRecord.findUnique({ where: { id: expiring.id } }))
            .status,
          'expired',
        );
        const exercise = (action, booking, time) =>
          JSON.parse(
            execFileSync(
              process.execPath,
              [
                '--import',
                'tsx',
                'scripts/testing/booking-system-port.ts',
                action,
                booking.id,
                time,
                staff.account.id,
              ],
              {
                env: process.env,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
              },
            ),
          );
        const started = exercise(
          'start',
          confirmed,
          new Date(Date.parse(confirmed.startsAt) + 60000).toISOString(),
        );
        assert.equal(started.status, 'in_progress');
        const completed = exercise(
          'complete',
          confirmed,
          new Date(Date.parse(confirmed.startsAt) + 1800000).toISOString(),
        );
        assert.equal(completed.status, 'completed');
        const attended = await db.bookingRecord.findUnique({
          where: { id: confirmed.id },
        });
        assert.equal(
          attended.occupiedEndsAt.toISOString(),
          confirmed.occupiedEndsAt,
        );
        const missed = exercise(
          'no_show',
          scheduling.second,
          new Date(
            Date.parse(scheduling.second.startsAt) + 16 * 60000,
          ).toISOString(),
        );
        assert.equal(missed.status, 'no_show');
        const lodgingResource = expect(
          await request(
            '/services/admin/resources',
            {
              organizationId: org.id,
              profile: {
                name: 'Dog rooms',
                kind: 'lodging',
                capacity: 2,
                status: 'active',
                windows: Array.from({ length: 7 }, (_, i) => ({
                  day: i + 1,
                  startMinute: 0,
                  endMinute: 1440,
                })),
              },
              reason: why,
            },
            staff.headers,
          ),
        );
        const lodging = await create({
          category: 'lodging',
          kind: 'lodging',
          durationMinutes: null,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          checkInMinute: 900,
          checkOutMinute: 660,
          minNights: 1,
          maxNights: 7,
          resourceIds: [lodgingResource.id],
        });
        const endDate = new Date(Date.parse(day) + 2 * 86400000)
          .toISOString()
          .slice(0, 10);
        const stay = expect(
          await request(
            '/bookings',
            {
              ...payload,
              serviceId: lodging.id,
              resourceId: lodgingResource.id,
              animalId: pets[2].id,
              idempotencyKey: randomUUID(),
              expectedResourceVersion: 1,
              expectedTotalMinor: 7000000,
              slot: { kind: 'lodging', startDate: day, endDate },
            },
            buyer.headers,
          ),
        );
        assert.equal(stay.acceptance.nights, 2);
        assert.equal(stay.acceptance.totalMinor, 7000000);
        assert.equal(stay.acceptance.collectionMode, undefined);
        assert.equal(stay.acceptance.service.collectionMode, 'pay_at_business');
        const company = expect(
          await request(
            '/bookings/admin?organizationId=' + org.id,
            undefined,
            staff.headers,
            'GET',
          ),
          200,
        );
        assert.ok(company.total >= 5);
        assert.equal(
          (
            await request(
              '/bookings/admin?organizationId=' + org.id,
              undefined,
              other.headers,
              'GET',
            )
          ).status,
          403,
        );
        Object.assign(scheduling, { pending: confirmed, lodging: stay });
      },
    );
    await t.test(
      'PostgreSQL rejects forged booking projections, missing revision evidence and raw concurrent overbooking',
      async () => {
        const { buyer, resource, service, staff, why, expect, org } =
          scheduling;
        await assert.rejects(
          db.bookingRecord.update({
            where: { id: scheduling.lodging.id },
            data: {
              status: 'cancelled',
              version: { increment: 1 },
              expiresAt: null,
            },
          }),
        );
        const raw = async (pet, sample) => {
          const id = randomUUID(),
            s = {
              ...sample,
              id,
              animalId: pet.id,
              idempotencyKey: randomUUID(),
              fingerprint: 'f'.repeat(64),
              acceptance: {
                ...sample.acceptance,
                pet: { id: pet.id, name: pet.name, species: 'dog' },
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1,
            };
          return db.$transaction(async (tx) => {
            const { acceptance, ...columns } = s;
            void acceptance;
            await tx.bookingRecord.create({
              data: {
                ...columns,
                startsAt: new Date(s.startsAt),
                endsAt: new Date(s.endsAt),
                occupiedStartsAt: new Date(s.occupiedStartsAt),
                occupiedEndsAt: new Date(s.occupiedEndsAt),
                createdAt: new Date(s.createdAt),
                updatedAt: new Date(s.updatedAt),
                expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
                snapshot: s,
              },
            });
            await tx.bookingAuditEntry.create({
              data: {
                id: randomUUID(),
                bookingId: id,
                actorId: buyer.account.id,
                action: 'created',
                version: 1,
                snapshot: s,
                reason: why,
                requestId: randomUUID(),
                createdAt: new Date(),
              },
            });
          });
        };
        // Use a new one-capacity resource and published service, with two different pets.
        const one = expect(
          await request(
            '/services/admin/resources',
            {
              organizationId: org.id,
              profile: {
                ...scheduling.resourceProfile,
                name: 'Single room',
                capacity: 1,
              },
              reason: why,
            },
            staff.headers,
          ),
        );
        const fresh = await scheduling.create({ resourceIds: [one.id] });
        const avail = expect(
          await request(
            `/services/${fresh.id}/availability?resourceId=${one.id}&from=${scheduling.day}&to=${scheduling.day}`,
            undefined,
            {},
            'GET',
          ),
          200,
        );
        const template = expect(
          await request(
            '/bookings',
            scheduling.body(scheduling.pets[0], avail.slots[0], {
              serviceId: fresh.id,
              resourceId: one.id,
              expectedResourceVersion: 1,
            }),
            buyer.headers,
          ),
        );
        expect(
          await request(
            '/bookings/' + template.id + '/cancel',
            { expectedVersion: 1, reason: why },
            buyer.headers,
          ),
          200,
        );
        const row = await db.bookingRecord.findUnique({
            where: { id: template.id },
          }),
          sample = {
            ...row.snapshot,
            status: 'confirmed',
            version: 1,
            expiresAt: null,
          };
        const a = expect(
            await request(
              '/animals',
              { profile: { name: 'Raw dog one', species: 'dog' }, reason: why },
              buyer.headers,
            ),
          ),
          b = expect(
            await request(
              '/animals',
              { profile: { name: 'Raw dog two', species: 'dog' }, reason: why },
              buyer.headers,
            ),
          );
        const result = await Promise.allSettled([
          raw(a, sample),
          raw(b, sample),
        ]);
        assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal(result.filter((r) => r.status === 'rejected').length, 1);
        assert.equal(
          await db.bookingRecord.count({
            where: { resourceId: one.id, status: 'confirmed' },
          }),
          1,
        );
        await assert.rejects(
          db.bookingRecord.delete({ where: { id: template.id } }),
        );
        await assert.rejects(
          db.serviceAuditEntry.deleteMany({ where: { serviceId: service.id } }),
        );
        assert.equal(
          (
            await request(
              '/services/admin/resources/' + resource.id,
              {
                organizationId: org.id,
                profile: {
                  ...scheduling.resourceProfile,
                  windows: [{ day: 1, startMinute: 480, endMinute: 495 }],
                },
                expectedVersion: 3,
                reason: why,
              },
              staff.headers,
              'PATCH',
            )
          ).status,
          409,
        );
      },
    );

    await t.test(
      'notification inbox preserves all business sources and isolates recipients with one-way reads',
      async () => {
        const { buyer, other, admin } = scheduling;
        for (const category of [
          'orders',
          'adoptions',
          'organizations',
          'bookings',
        ])
          assert.ok(
            await db.inboxNotification.count({ where: { category } }),
            category,
          );
        assert.ok(
          await db.inboxNotification.count({
            where: { category: 'orders', status: 'paid' },
          }),
          'Verified payment emits a paid event.',
        );
        const inbox = await request(
          '/notifications?category=bookings&limit=50',
          undefined,
          buyer.headers,
          'GET',
        );
        assert.equal(inbox.status, 200, JSON.stringify(inbox.body));
        assert.ok(inbox.body.items.length > 0);
        const item = inbox.body.items.find(
          (n) => Date.parse(n.createdAt) <= Date.now(),
        );
        assert.ok(item);
        assert.ok(
          !('userId' in item) && !('details' in item) && !('eventKey' in item),
        );
        assert.equal(
          (await request(`/notifications/${item.id}/read`, {}, other.headers))
            .status,
          404,
        );
        assert.equal(
          (await request(`/notifications/${item.id}/read`, {}, admin)).status,
          404,
        );
        const own = await request(
          `/notifications/${item.id}/read`,
          {},
          buyer.headers,
        );
        assert.equal(own.status, 200);
        assert.equal(
          (await request(`/notifications/${item.id}/read`, {}, buyer.headers))
            .body.readAt,
          own.body.readAt,
        );
        await assert.rejects(
          db.inboxNotification.update({
            where: { id: item.id },
            data: { readAt: null },
          }),
        );
        await assert.rejects(
          db.inboxNotification.update({
            where: { id: item.id },
            data: { body: 'Changed history' },
          }),
        );
        await assert.rejects(
          db.inboxNotification.delete({ where: { id: item.id } }),
        );
        const through = new Date().toISOString();
        assert.equal(
          (await request('/notifications/read-all', { through }, buyer.headers))
            .status,
          200,
        );
        assert.equal(
          (await request('/notifications/read-all', { through }, buyer.headers))
            .body.updated,
          0,
        );
        assert.equal(
          (
            await request(
              '/notifications/read-all',
              { through: new Date(Date.now() + 60000).toISOString() },
              buyer.headers,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              '/notifications?userId=' + other.account.id,
              undefined,
              buyer.headers,
              'GET',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              '/notifications?limit=51',
              undefined,
              buyer.headers,
              'GET',
            )
          ).status,
          400,
        );
        assert.equal(
          (await request('/notifications', undefined, {}, 'GET')).status,
          401,
        );
        assert.equal(
          (
            await request(
              '/notifications/admin/failed-deliveries',
              undefined,
              buyer.headers,
              'GET',
            )
          ).status,
          403,
        );
        const count = await request(
          '/notifications/unread-count',
          undefined,
          buyer.headers,
          'GET',
        );
        assert.equal(count.status, 200);
        assert.equal(
          count.body.count,
          await db.inboxNotification.count({
            where: { userId: buyer.account.id, readAt: null },
          }),
        );
      },
    );
    await t.test(
      'notification preferences have optimistic versions, cancel optional queues and preserve mandatory membership events atomically',
      async () => {
        const { buyer, other, org, admin } = scheduling;
        const initial = await request(
          '/notifications/preferences',
          undefined,
          buyer.headers,
          'GET',
        );
        assert.equal(initial.status, 200);
        assert.equal(initial.body.version, 0);
        const n = await db.inboxNotification.findFirstOrThrow({
          where: { userId: buyer.account.id, category: 'bookings' },
        });
        const pendingId = randomUUID();
        await db.outboxMessage.create({
          data: {
            id: pendingId,
            notificationId: n.id,
            mailPurpose: 'booking_reminder',
            expiresAt: new Date(Date.now() + 86400000),
            notBefore: new Date(Date.now() + 3600000),
          },
        });
        const disabled = {
          expectedVersion: 0,
          ordersEmail: false,
          adoptionsEmail: false,
          bookingsEmail: false,
        };
        const saved = await request(
          '/notifications/preferences',
          disabled,
          buyer.headers,
          'PUT',
        );
        assert.equal(saved.status, 200, JSON.stringify(saved.body));
        assert.equal(saved.body.version, 1);
        assert.equal(saved.body.organizationEmailMandatory, true);
        const pending = await db.outboxMessage.findUniqueOrThrow({
          where: { id: pendingId },
        });
        assert.equal(pending.failureKind, 'preferences_disabled');
        assert.equal(pending.encryptedPayload, null);
        assert.equal(
          (
            await request(
              '/notifications/preferences',
              disabled,
              buyer.headers,
              'PUT',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              '/notifications/preferences',
              { ...disabled, expectedVersion: 1, userId: other.account.id },
              buyer.headers,
              'PUT',
            )
          ).status,
          400,
        );
        await assert.rejects(
          db.notificationPreference.update({
            where: { userId: buyer.account.id },
            data: { version: 1 },
          }),
        );
        const memberPath = `/organizations/${org.id}/members/${buyer.account.id}/role`;
        const reason = 'Membership receipt and transaction rollback verified.';
        await db.$executeRawUnsafe(
          `CREATE FUNCTION reject_test_inbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated inbox failure'; END $$`,
        );
        await db.$executeRawUnsafe(
          `CREATE TRIGGER reject_test_inbox BEFORE INSERT ON notification_inbox FOR EACH ROW EXECUTE FUNCTION reject_test_inbox()`,
        );
        try {
          assert.equal(
            (
              await request(
                memberPath,
                { role: 'business_operator', reason },
                admin,
                'PUT',
              )
            ).status,
            500,
          );
          assert.equal(
            await db.organizationMembership.count({
              where: { organizationId: org.id, userId: buyer.account.id },
            }),
            0,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_test_inbox ON notification_inbox',
          );
          await db.$executeRawUnsafe('DROP FUNCTION reject_test_inbox()');
        }
        assert.equal(
          (
            await request(
              memberPath,
              { role: 'business_operator', reason },
              admin,
              'PUT',
            )
          ).status,
          200,
        );
        const mandatory = await db.inboxNotification.findFirstOrThrow({
          where: {
            userId: buyer.account.id,
            category: 'organizations',
            eventType: 'membership.role_assigned',
          },
          orderBy: { createdAt: 'desc' },
        });
        assert.equal(
          await db.outboxMessage.count({
            where: { notificationId: mandatory.id },
          }),
          1,
        );
        const before = await db.inboxNotification.count({
          where: { userId: buyer.account.id },
        });
        assert.equal(
          (
            await request(
              memberPath,
              { role: 'business_operator', reason },
              admin,
              'PUT',
            )
          ).status,
          200,
        );
        assert.equal(
          await db.inboxNotification.count({
            where: { userId: buyer.account.id },
          }),
          before,
          'No-op membership is not a duplicate event.',
        );
        const versions = await Promise.all(
          [true, false].map((ordersEmail) =>
            request(
              '/notifications/preferences',
              { ...disabled, expectedVersion: 1, ordersEmail },
              buyer.headers,
              'PUT',
            ),
          ),
        );
        assert.deepEqual(versions.map((r) => r.status).sort(), [200, 409]);
      },
    );
    await t.test(
      'business delivery recovery uses fresh audited IDs, preserves deadlines and rejects auth or canceled mail',
      async () => {
        const { buyer, admin } = scheduling;
        const notice = await db.inboxNotification.findFirstOrThrow({
          where: { userId: buyer.account.id, category: 'organizations' },
        });
        const parent = await db.outboxMessage.create({
          data: {
            id: randomUUID(),
            notificationId: notice.id,
            subjectType: notice.subjectType,
            subjectId: notice.subjectId,
            subjectVersion: notice.subjectVersion,
            mailPurpose: 'business_notice',
            failedAt: new Date(),
            failureKind: 'delivery_failed',
            expiresAt: new Date(Date.now() + 3600000),
            attempts: 5,
          },
        });
        const path = `/notifications/admin/deliveries/${parent.id}/retry`,
          body = {
            reason:
              'SMTP outage resolved; retry delivery with original deadline.',
          };
        assert.equal((await request(path, body, buyer.headers)).status, 403);
        const tries = await Promise.all([
          request(path, body, admin),
          request(path, body, admin),
        ]);
        assert.deepEqual(
          tries.map((r) => r.status),
          [201, 201],
          JSON.stringify(tries),
        );
        const child = tries[0].body;
        assert.equal(child.id, tries[1].body.id);
        assert.notEqual(child.id, parent.id);
        assert.equal(child.expiresAt, parent.expiresAt.toISOString());
        assert.equal(child.retryOfId, parent.id);
        assert.ok(!('encryptedPayload' in child) && !('to' in child));
        const audit = await db.notificationRetryAudit.findUniqueOrThrow({
          where: { failedOutboxId: parent.id },
        });
        await assert.rejects(
          db.notificationRetryAudit.update({
            where: { id: audit.id },
            data: { reason: 'Tampered evidence' },
          }),
        );
        const deadline = Date.now() + 20000;
        let delivered;
        do {
          delivered = await db.outboxMessage.findUniqueOrThrow({
            where: { id: child.id },
          });
          if (delivered.deliveredAt) break;
          await new Promise((r) => setTimeout(r, 200));
        } while (Date.now() < deadline);
        assert.ok(
          delivered.deliveredAt,
          'Retry reaches real isolated worker/SMTP.',
        );
        assert.equal(delivered.encryptedPayload, null);
        const authFailed = await db.outboxMessage.create({
          data: {
            id: randomUUID(),
            failureKind: 'delivery_failed',
            failedAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
        assert.equal(
          (
            await request(
              `/notifications/admin/deliveries/${authFailed.id}/retry`,
              body,
              admin,
            )
          ).status,
          409,
        );
        const canceled = await db.outboxMessage.create({
          data: {
            id: randomUUID(),
            notificationId: notice.id,
            mailPurpose: 'business_notice',
            failureKind: 'superseded',
            failedAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
        assert.equal(
          (
            await request(
              `/notifications/admin/deliveries/${canceled.id}/retry`,
              body,
              admin,
            )
          ).status,
          409,
        );
        const failed = await request(
          '/notifications/admin/failed-deliveries?limit=50',
          undefined,
          admin,
          'GET',
        );
        assert.equal(failed.status, 200);
        for (const row of failed.body.items)
          assert.ok(
            !('encryptedPayload' in row) &&
              !('correlationKey' in row) &&
              !('to' in row),
          );
        const spec = await (await fetch(base + '/openapi.json')).json();
        assert.equal(
          Object.values(spec.paths)
            .flatMap((p) => Object.values(p))
            .filter((op) => op.tags?.includes('Notifications')).length,
          8,
        );
      },
    );
    await t.test(
      'veterinary accreditation privately verifies evidence, guards publication/booking and revokes clinical access',
      async () => {
        const {
          staff,
          buyer,
          other,
          admin,
          org,
          profile,
          pets,
          day,
          body: bookingBody,
          expect,
        } = scheduling;
        const why =
          'Professional evidence and official register manually verified.';
        const resource = expect(
          await request(
            '/services/admin/resources',
            {
              organizationId: org.id,
              profile: {
                ...scheduling.resourceProfile,
                capacity: 1,
                name: 'Dedicated veterinarian schedule',
              },
              reason: why,
            },
            staff.headers,
          ),
        );
        const data = {
          organizationId: org.id,
          professionalId: staff.account.id,
          resourceId: resource.id,
          profile: {
            profession: 'veterinarian',
            registrationNumber: '98765432',
            university: 'Verified veterinary university',
            consent: true,
          },
          reason: why,
        };
        assert.equal(
          (
            await request(
              '/veterinary/credentials',
              { ...data, professionalId: other.account.id },
              staff.headers,
            )
          ).status,
          403,
        );
        let c = expect(
          await request('/veterinary/credentials', data, staff.headers),
        );
        const path = '/veterinary/credentials/' + c.id;
        assert.equal(
          (await request(path, undefined, buyer.headers, 'GET')).status,
          403,
        );
        assert.equal(
          (
            await request(
              '/veterinary/credentials',
              undefined,
              staff.headers,
              'GET',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              path + '/submit',
              { expectedVersion: c.version, reason: why },
              staff.headers,
            )
          ).status,
          409,
        );
        const clinical = {
          ...profile,
          category: 'veterinary',
          veterinaryCredentialId: c.id,
          resourceIds: [resource.id],
          name: 'Veterinary consultation',
        };
        assert.equal(
          (
            await request(
              '/services/admin',
              { organizationId: org.id, profile: clinical, reason: why },
              staff.headers,
            )
          ).status,
          409,
        );
        const image = await require('sharp')({
          create: {
            width: 600,
            height: 400,
            channels: 3,
            background: '#ffffff',
          },
        })
          .png()
          .toBuffer();
        const upload = async (kind, bytes = image, mime = 'image/png') => {
          const form = new FormData();
          form.set('file', new Blob([bytes], { type: mime }), 'evidence.png');
          form.set('kind', kind);
          form.set('expectedVersion', String(c.version));
          form.set('reason', why);
          const r = await fetch(base + path + '/documents', {
            method: 'POST',
            headers: staff.headers,
            body: form,
          });
          return { status: r.status, body: await r.json() };
        };
        assert.equal(
          (
            await upload(
              'professional_card',
              Buffer.from('<svg/>'),
              'image/svg+xml',
            )
          ).status,
          400,
        );
        await db.$executeRawUnsafe(
          `CREATE FUNCTION reject_test_credential_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated credential evidence failure'; END $$`,
        );
        await db.$executeRawUnsafe(
          `CREATE TRIGGER reject_test_credential_audit BEFORE INSERT ON veterinary_credential_audit FOR EACH ROW EXECUTE FUNCTION reject_test_credential_audit()`,
        );
        try {
          assert.equal((await upload('professional_card')).status, 500);
          assert.equal(
            await db.mediaAsset.count({ where: { resourceId: c.id } }),
            0,
          );
        } finally {
          await db.$executeRawUnsafe(
            'DROP TRIGGER reject_test_credential_audit ON veterinary_credential_audit',
          );
          await db.$executeRawUnsafe(
            'DROP FUNCTION reject_test_credential_audit()',
          );
        }
        for (const kind of [
          'professional_card',
          'qualification',
          'standing_certificate',
        ])
          c = expect(await upload(kind));
        const evidence = c.documents[0].mediaId;
        assert.equal(
          (
            await fetch(base + path + '/documents/' + evidence, {
              headers: buyer.headers,
            })
          ).status,
          403,
        );
        const document = await fetch(base + path + '/documents/' + evidence, {
          headers: staff.headers,
        });
        assert.equal(document.status, 200);
        assert.match(document.headers.get('content-type'), /image\/jpeg/);
        assert.equal(document.headers.get('cache-control'), 'no-store');
        c = expect(
          await request(
            path + '/submit',
            { expectedVersion: c.version, reason: why },
            staff.headers,
          ),
        );
        assert.equal((await upload('professional_card')).status, 409);
        const review = {
          expectedVersion: c.version,
          approved: true,
          reason: why,
          officialRegisterChecked: true,
          verificationReference:
            'Official COMVEZCOL registry and qualification cross-checked in isolated test.',
          verifiedUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        };
        assert.equal(
          (await request(path + '/review', review, staff.headers)).status,
          403,
        );
        assert.equal(
          (
            await request(
              path + '/review',
              {
                ...review,
                verifiedUntil: new Date(
                  Date.now() + 91 * 86400000,
                ).toISOString(),
              },
              admin,
            )
          ).status,
          400,
        );
        c = expect(await request(path + '/review', review, admin));
        await assert.rejects(
          db.veterinaryCredential.update({
            where: { id: c.id },
            data: { professionalId: other.account.id },
          }),
        );
        await assert.rejects(
          db.veterinaryCredential.delete({ where: { id: c.id } }),
        );
        const audit = await db.veterinaryCredentialAudit.findFirstOrThrow({
          where: { credentialId: c.id },
        });
        await assert.rejects(
          db.veterinaryCredentialAudit.update({
            where: { id: audit.id },
            data: { reason: 'Tampered audit' },
          }),
        );
        const svc = expect(
          await request(
            '/services/admin',
            { organizationId: org.id, profile: clinical, reason: why },
            staff.headers,
          ),
        );
        const submitted = expect(
          await request(
            '/services/admin/' + svc.id + '/submit',
            { expectedVersion: svc.version, reason: why },
            staff.headers,
          ),
          200,
        );
        const published = expect(
          await request(
            '/services/admin/' + svc.id + '/review',
            { expectedVersion: submitted.version, reason: why, approved: true },
            admin,
          ),
          200,
        );
        const avail = expect(
          await request(
            `/services/${svc.id}/availability?resourceId=${resource.id}&from=${day}&to=${day}`,
            undefined,
            {},
            'GET',
          ),
          200,
        );
        assert.ok(avail.slots.length);
        const chosen =
          avail.slots.find(
            (slot) =>
              !scheduling.second ||
              Date.parse(slot.startsAt) >=
                Date.parse(scheduling.second.endsAt) + 3600000,
          ) ?? avail.slots.at(-1);
        const booking = expect(
          await request(
            '/bookings',
            {
              ...bookingBody(pets[0], chosen, { resourceId: resource.id }),
              serviceId: svc.id,
              expectedServiceVersion: published.version,
              expectedResourceVersion: resource.version,
              idempotencyKey: randomUUID(),
            },
            buyer.headers,
          ),
        );
        assert.equal(booking.acceptance.service.veterinaryCredentialId, c.id);
        assert.equal(
          (
            await request(
              `/services/${svc.id}/availability?resourceId=${resource.id}&from=${day}&to=${day}`,
              undefined,
              {},
              'GET',
            )
          ).status,
          200,
        );
        const revoked = expect(
          await request(
            path + '/revoke',
            {
              expectedVersion: c.version,
              reason:
                'Professional authorization withdrawn pending a fresh review.',
            },
            admin,
          ),
          200,
        );
        assert.equal(revoked.status, 'revoked');
        assert.equal(
          (await request('/services/' + svc.id, undefined, {}, 'GET')).status,
          404,
        );
        assert.equal(
          (
            await request(
              '/bookings',
              {
                ...bookingBody(pets[1], chosen, { resourceId: resource.id }),
                serviceId: svc.id,
                expectedServiceVersion: published.version,
                expectedResourceVersion: resource.version,
                idempotencyKey: randomUUID(),
              },
              buyer.headers,
            )
          ).status,
          409,
        );
        assert.ok(
          await db.bookingRecord.findUnique({ where: { id: booking.id } }),
          'Historical accepted booking remains.',
        );
        assert.equal(
          (
            await request(
              '/services/admin/' + svc.id + '/pause',
              { expectedVersion: published.version, reason: why },
              staff.headers,
            )
          ).status,
          200,
        );
        const trail = await request(path + '/audit', undefined, admin, 'GET');
        assert.equal(trail.status, 200);
        assert.ok(trail.body.items.length >= 6);
      },
    );
    await t.test(
      'operational probes bypass Redis rate limits, private metrics redact identity and retention preserves live tokens',
      async () => {
        const live = await request('/health/live', undefined, {}, 'GET');
        assert.equal(live.status, 200);
        assert.equal(live.body.status, 'alive');
        const ready = await request('/health/ready', undefined, {}, 'GET');
        assert.equal(ready.status, 200);
        assert.deepEqual(ready.body.dependencies, {
          database: true,
          redis: true,
        });
        assert.equal((await fetch(base + '/metrics')).status, 401);
        const metrics = await fetch(base + '/metrics', {
          headers: { Authorization: 'Bearer ' + process.env.METRICS_TOKEN },
        });
        assert.equal(metrics.status, 200);
        const text = await metrics.text();
        assert.ok(text.includes('pettly_http_duration_seconds_bucket'));
        assert.ok(text.includes('pettly_worker_heartbeat 1'));
        assert.ok(!text.includes(scheduling.buyer.account.email));
        assert.ok(!text.includes(scheduling.org.id));
        const uid = scheduling.other.account.id,
          old = new Date(Date.now() - 31 * 86400000);
        const session = await db.session.create({
          data: {
            id: randomUUID(),
            userId: uid,
            expiresAt: old,
            createdAt: new Date(+old - 86400000),
          },
        });
        const token = await db.actionToken.create({
          data: {
            hash: createHash('sha256').update(randomUUID()).digest('hex'),
            userId: uid,
            purpose: 'reset',
            expiresAt: old,
          },
        });
        const { execFileSync } = await import('node:child_process');
        const report = JSON.parse(
          execFileSync(process.execPath, ['scripts/ops/retention.mjs'], {
            env: process.env,
            encoding: 'utf8',
          }),
        );
        assert.equal(report.mode, 'dry-run');
        assert.ok(await db.session.findUnique({ where: { id: session.id } }));
        const applied = JSON.parse(
          execFileSync(
            process.execPath,
            ['scripts/ops/retention.mjs', '--apply'],
            { env: process.env, encoding: 'utf8' },
          ),
        );
        assert.equal(applied.mode, 'apply');
        assert.equal(
          await db.session.findUnique({ where: { id: session.id } }),
          null,
        );
        assert.equal(
          await db.actionToken.findUnique({ where: { hash: token.hash } }),
          null,
        );
        assert.equal(
          (
            await request(
              '/users/me',
              undefined,
              scheduling.other.headers,
              'GET',
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      'concurrent superadministrator deletion preserves one active verified administrator',
      async () => {
        const admin = await adminLogin(),
          headers = bearer(admin.accessToken),
          other = await createAccount(
            'delete-super-admin@example.com',
            headers,
          );
        assert.equal(
          (
            await request(
              '/users/' + other.account.id + '/role',
              { role: 'super_admin', reason },
              headers,
              'PATCH',
            )
          ).status,
          200,
        );
        await resetRate();
        const second = await request('/auth/login', {
          email: other.account.email,
          password,
          client: 'mobile',
        });
        assert.equal(second.status, 200);
        const results = await Promise.all([
          request('/auth/account', { password, reason }, headers, 'DELETE'),
          request(
            '/auth/account',
            { password, reason },
            bearer(second.body.accessToken),
            'DELETE',
          ),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        assert.equal(
          await db.user.count({
            where: {
              globalRole: 'super_admin',
              status: 'active',
              emailVerifiedAt: { not: null },
            },
          }),
          1,
        );
        await resetRate();
      },
    );
    await t.test(
      'rotation, replay detection and immediate access revocation',
      async () => {
        const session = await login();
        const next = await request('/auth/refresh', {
          refreshToken: session.refreshToken,
        });
        assert.equal(next.status, 200);
        assert.notEqual(next.body.refreshToken, session.refreshToken);
        assert.equal(
          (
            await request('/auth/refresh', {
              refreshToken: session.refreshToken,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              '/users/me',
              undefined,
              bearer(next.body.accessToken),
              'GET',
            )
          ).status,
          401,
        );
      },
    );
    await t.test(
      'concurrent refresh has one winner and replay revokes the family',
      async () => {
        const session = await login();
        const results = await Promise.all([
          request('/auth/refresh', { refreshToken: session.refreshToken }),
          request('/auth/refresh', { refreshToken: session.refreshToken }),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
        assert.equal(
          (
            await request(
              '/users/me',
              undefined,
              bearer(results.find((r) => r.status === 200).body.accessToken),
              'GET',
            )
          ).status,
          401,
        );
      },
    );
    await t.test(
      'web refresh stays in HttpOnly cookies and requires CSRF protection',
      async () => {
        await resetRate();
        const headers = {
          Origin: 'http://localhost:3001',
          'X-CSRF-Protection': '1',
        };
        const response = await request(
          '/auth/login',
          { email, password },
          headers,
        );
        assert.equal(response.status, 200);
        assert.equal(response.body.refreshToken, undefined);
        const cookie = response.headers.get('set-cookie');
        assert.match(cookie, /HttpOnly/i);
        assert.match(cookie, /SameSite=Lax/i);
        const value = cookie.split(';')[0];
        assert.equal(
          (await request('/auth/refresh', {}, { Cookie: value })).status,
          400,
        );
        const renewed = await request(
          '/auth/refresh',
          {},
          { ...headers, Cookie: value },
        );
        assert.equal(renewed.status, 200);
        assert.equal(renewed.body.refreshToken, undefined);
        assert.equal(
          (
            await request(
              '/auth/refresh',
              {},
              {
                Origin: 'https://untrusted.example',
                'X-CSRF-Protection': '1',
                Cookie: value,
              },
            )
          ).status,
          400,
        );
      },
    );
    await t.test(
      'logout-all immediately revokes multiple sessions',
      async () => {
        const one = await login(),
          two = await login();
        assert.equal(
          (await request('/auth/logout-all', {}, bearer(one.accessToken)))
            .status,
          200,
        );
        for (const session of [one, two])
          assert.equal(
            (
              await request(
                '/users/me',
                undefined,
                bearer(session.accessToken),
                'GET',
              )
            ).status,
            401,
          );
      },
    );
    await t.test(
      'password recovery has uniform responses and revokes all sessions',
      async () => {
        const session = await login();
        const absent = await request('/auth/forgot-password', {
          email: 'absent@example.com',
        });
        const present = await request('/auth/forgot-password', { email });
        assert.equal(absent.status, 202);
        assert.deepEqual(absent.body, present.body);
        const token = await emailToken(email, 'reset');
        const newPassword = 'Another sufficiently long password!';
        assert.equal(
          (
            await request('/auth/reset-password', {
              token,
              password: newPassword,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request('/auth/reset-password', {
              token,
              password: newPassword,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              '/users/me',
              undefined,
              bearer(session.accessToken),
              'GET',
            )
          ).status,
          401,
        );
        await resetRate();
        assert.equal(
          (await request('/auth/login', { email, password, client: 'mobile' }))
            .status,
          401,
        );
        const next = await request('/auth/login', {
          email,
          password: newPassword,
          client: 'mobile',
        });
        assert.equal(next.status, 200);
        assert.equal(
          (await request('/auth/logout', {}, bearer(next.body.accessToken)))
            .status,
          200,
        );
        assert.equal(
          (
            await request(
              '/users/me',
              undefined,
              bearer(next.body.accessToken),
              'GET',
            )
          ).status,
          401,
        );
      },
    );
    await t.test(
      'expired and wrong-purpose action tokens cannot mutate accounts',
      async () => {
        const reset = await db.actionToken.findFirst({
          where: { purpose: 'reset' },
        });
        assert.ok(reset);
        const raw = 'B'.repeat(43);
        const { createHash } = await import('node:crypto');
        await db.actionToken.create({
          data: {
            hash: createHash('sha256').update(raw).digest('hex'),
            userId: reset.userId,
            purpose: 'reset',
            expiresAt: new Date(Date.now() - 1000),
          },
        });
        assert.equal(
          (await request('/auth/reset-password', { token: raw, password }))
            .status,
          400,
        );
        assert.equal(
          (await request('/auth/verify-email', { token: raw })).status,
          400,
        );
      },
    );
    await t.test(
      'distributed rate limits return a safe error and Retry-After',
      async () => {
        await resetRate();
        for (let i = 0; i < 5; i++)
          assert.equal(
            (
              await request('/auth/login', {
                email: 'missing@example.com',
                password,
                client: 'mobile',
              })
            ).status,
            401,
          );
        const result = await request('/auth/login', {
          email: 'missing@example.com',
          password,
          client: 'mobile',
        });
        assert.equal(result.status, 429);
        assert.ok(Number(result.headers.get('retry-after')) > 0);
        assert.equal(result.body.code, 'RATE_LIMITED');
        assert.ok(result.body.requestId);
      },
    );
    await t.test(
      'OpenAPI exposes all auth contracts and security schemes',
      async () => {
        const spec = await (await fetch(base + '/openapi.json')).json();
        assert.equal(spec.info.title, 'Pettly API');
        assert.ok(spec.components.securitySchemes.accessToken);
        for (const path of [
          'register',
          'login',
          'refresh',
          'logout',
          'logout-all',
          'forgot-password',
          'reset-password',
          'verify-email',
          'resend-verification',
        ])
          assert.ok(spec.paths['/api/auth/' + path].post.operationId);
        assert.ok(spec.paths['/api/users/me'].patch);
        for (const path of [
          'accept-invitation',
          'change-password',
          'change-email',
          'confirm-email-change',
        ])
          assert.ok(spec.paths['/api/auth/' + path].post.operationId);
        assert.ok(spec.paths['/api/auth/sessions'].get.operationId);
        assert.ok(
          spec.paths['/api/auth/sessions/{sessionId}'].delete.operationId,
        );
        assert.ok(spec.paths['/api/auth/account'].delete.operationId);
        assert.ok(spec.paths['/api/users'].get.operationId);
        assert.ok(spec.paths['/api/users'].post.responses['202']);
        assert.ok(spec.paths['/api/users/{userId}'].delete.operationId);
        assert.ok(spec.paths['/api/users/{userId}/audit'].get.operationId);
        assert.ok(
          !Object.keys(spec.paths).some((path) => /otp|mfa/.test(path)),
          'OTP is paused.',
        );
      },
    );
  } finally {
    await redis.quit();
    await db.$disconnect();
  }
});
