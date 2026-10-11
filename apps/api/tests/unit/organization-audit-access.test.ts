import test from 'node:test';
import assert from 'node:assert/strict';
import { OrganizationLifecycleHandlers } from '../../src/modules/organizations/application/handlers/organization-lifecycle.handlers';
import { OrganizationPageQuery } from '../../src/modules/organizations/application/queries/organization-management.queries';
import type { OrganizationsWork } from '../../src/modules/organizations/application/ports/out/organizations-repository';
import { Organization } from '../../src/modules/organizations/domain/aggregates/organization';
import { User } from '../../src/modules/users/domain/aggregates/user';
import type {
  MembershipRole,
  GlobalRole,
} from '../../src/shared/domain/authorization';
const now = new Date('2026-10-10T12:00:00Z');
const unused = async (): Promise<never> => {
  throw new Error('Unexpected adapter call');
};
function fixture(
  role: MembershipRole | null,
  globalRole: GlobalRole = 'user',
  archived = false,
  verified = true,
) {
  let reads = 0;
  const user = {
    ...User.create(
      'actor',
      'actor@example.com',
      { name: 'María', lastName: 'Pérez' },
      now,
    ).snapshot(),
    globalRole,
    emailVerifiedAt: verified ? now : null,
  };
  const state = {
    ...Organization.create(
      'own',
      'Company',
      'business',
      now,
      {},
      'actor',
    ).snapshot(),
    status: archived ? ('deleted' as const) : ('draft' as const),
  };
  const work: OrganizationsWork = {
    lock: unused,
    find: async () => state,
    save: unused,
    list: unused,
    members: unused,
    audits: async (id, page, limit) => {
      reads++;
      assert.equal(id, 'own');
      return { items: [], total: 0, page, limit };
    },
    create: unused,
    membership: async (id) =>
      role && id === 'own'
        ? {
            id: 'membership',
            organizationId: id,
            userId: 'actor',
            role,
            createdAt: now,
            updatedAt: now,
          }
        : null,
    assign: unused,
    remove: unused,
    audit: unused,
  };
  const handlers = new OrganizationLifecycleHandlers(
    { run: (callback) => callback(work), membershipsForUser: unused },
    { findById: async () => user, findByEmail: unused },
    { now: () => now },
    { id: () => 'id', token: () => 'token', digest: (value) => value },
  );
  return { handlers, reads: () => reads };
}
test('organization audit is bounded and available to its current administrators', async () => {
  for (const role of ['business_admin', 'adoption_admin'] as const) {
    const f = fixture(role);
    assert.deepEqual(
      await f.handlers.audits(new OrganizationPageQuery('actor', 'own', 2, 10)),
      { items: [], total: 0, page: 2, limit: 10 },
    );
    assert.equal(f.reads(), 1);
  }
});
test('operators, applicants without administrator membership and foreign organization access cannot read audit', async () => {
  for (const role of ['business_operator', null] as const) {
    const f = fixture(role);
    await assert.rejects(
      f.handlers.audits(new OrganizationPageQuery('actor', 'own')),
      { code: 'FORBIDDEN' },
    );
    assert.equal(f.reads(), 0);
  }
  const f = fixture('business_admin');
  await assert.rejects(
    f.handlers.audits(new OrganizationPageQuery('actor', 'foreign')),
    { code: 'FORBIDDEN' },
  );
  assert.equal(f.reads(), 0);
});
test('only active verified superadministrators can inspect archived organization history', async () => {
  const owner = fixture('business_admin', 'user', true);
  await assert.rejects(
    owner.handlers.audits(new OrganizationPageQuery('actor', 'own')),
    { code: 'FORBIDDEN' },
  );
  const admin = fixture(null, 'super_admin', true);
  await admin.handlers.audits(new OrganizationPageQuery('actor', 'own'));
  assert.equal(admin.reads(), 1);
  const unverified = fixture(null, 'super_admin', true, false);
  await assert.rejects(
    unverified.handlers.audits(new OrganizationPageQuery('actor', 'own')),
    { code: 'FORBIDDEN' },
  );
  assert.equal(unverified.reads(), 0);
});
