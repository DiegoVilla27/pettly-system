import test from 'node:test';
import assert from 'node:assert/strict';
import { VeterinaryHandlers } from '../../src/modules/veterinary/application/handlers/veterinary.handlers';
import {
  CredentialsQuery,
  EligibleCredentialsQuery,
} from '../../src/modules/veterinary/application/queries/credential.queries';
import type { CredentialsWork } from '../../src/modules/veterinary/application/ports/out/credentials-repository';
import type { CredentialState } from '../../src/modules/veterinary/domain/credential';
import type { UsersDirectory } from '../../src/modules/users/application/ports/out/users-directory';
import type { OrganizationAccess } from '../../src/modules/organizations/application/ports/in/organization-access';
import type { Authorization } from '../../src/modules/authorization/application/ports/in/authorization';
import { User } from '../../src/modules/users/domain/aggregates/user';
import { Organization } from '../../src/modules/organizations/domain/aggregates/organization';
const now = new Date('2026-10-10T12:00:00Z');
const unused = async (): Promise<never> => {
  throw Error('Unexpected adapter call');
};
function fixture() {
  let active = true,
    member = true,
    capacity = 1,
    verified = true,
    permission = true;
  let received: CredentialsQuery | undefined;
  const credential: CredentialState = {
    id: 'credential',
    organizationId: 'company',
    professionalId: 'professional',
    resourceId: 'resource',
    profession: 'veterinarian',
    registrationNumber: '123456',
    university: 'Private university',
    consent: true,
    status: 'approved',
    version: 5,
    documents: [{ mediaId: 'private', kind: 'professional_card' }],
    reviewedBy: 'reviewer',
    reviewedAt: now,
    verifiedUntil: new Date('2027-01-01T00:00:00Z'),
    verificationReference: 'Private register evidence',
    createdAt: now,
    updatedAt: now,
  };
  const user = User.create(
    'professional',
    'professional@example.com',
    { name: 'María', lastName: 'Pérez' },
    now,
  ).snapshot();
  const org = {
    ...Organization.create(
      'company',
      'Company',
      'business',
      now,
      {},
      'applicant',
    ).snapshot(),
    countryCode: 'CO',
    status: 'active' as const,
  };
  const tx: CredentialsWork = {
    lock: async () => undefined,
    find: unused,
    save: unused,
    audit: unused,
    audits: unused,
    list: async (q) => {
      received = q;
      return { items: [credential], total: 1 };
    },
  };
  const users: UsersDirectory = {
    findById: async (id) => ({
      ...user,
      id,
      status: active ? 'active' : 'disabled',
      emailVerifiedAt: verified ? now : null,
    }),
    findByEmail: unused,
    create: unused,
    countActiveSuperAdmins: unused,
    changeEmail: unused,
    anonymize: unused,
    audit: unused,
    verifyEmail: unused,
    updateProfile: unused,
  };
  const orgs: OrganizationAccess = {
    states: unused,
    findOrganization: async () => org,
    membershipsForUser: async (id) =>
      member
        ? [
            {
              id: 'membership',
              userId: id,
              organizationId: 'company',
              role: 'business_admin',
              organization: org,
              createdAt: now,
              updatedAt: now,
            },
          ]
        : [],
  };
  const authorization: Authorization = {
    roles: () => [],
    getUserAccess: unused,
    getAccess: unused,
    requirePermission: async (actor, p, scope) => {
      assert.equal(actor, 'operator');
      assert.equal(p, 'services.manage');
      assert.equal(scope, 'company');
      if (!permission) throw Error('Denied');
    },
  };
  const handlers = new VeterinaryHandlers(
    { run: (fn) => fn(tx) },
    users,
    orgs,
    { prepare: unused, store: unused, read: unused, remove: unused },
    { now: () => now },
    { id: () => '', token: () => '', digest: () => '' },
    {
      find: async () => ({
        id: 'resource',
        organizationId: 'company',
        kind: 'appointment',
        status: 'active',
        capacity,
      }),
    },
    authorization,
  );
  return {
    handlers,
    credential,
    query: () => received,
    disable: () => {
      active = false;
    },
    unverify: () => {
      verified = false;
    },
    unassign: () => {
      member = false;
    },
    share: () => {
      capacity = 2;
    },
    deny: () => {
      permission = false;
    },
    org,
  };
}
test('own directory derives the owner from the authenticated actor', async () => {
  const f = fixture();
  await f.handlers.mine(
    new CredentialsQuery(
      'professional',
      2,
      10,
      'company',
      'approved',
      'another-account',
    ),
  );
  assert.equal(f.query()?.professionalId, 'professional');
  assert.equal(f.query()?.page, 2);
  assert.equal(f.query()?.limit, 10);
});
test('eligible projection hides documents, registration and private verification data', async () => {
  const f = fixture();
  const result = await f.handlers.eligibleList(
    new EligibleCredentialsQuery('operator', 'company'),
  );
  assert.equal(result.candidateTotal, 1);
  assert.equal(result.items[0]?.professionalName, 'María Pérez');
  assert.deepEqual(
    Object.keys(result.items[0] ?? {}).sort(),
    [
      'id',
      'organizationId',
      'professionalId',
      'professionalName',
      'resourceId',
      'verifiedUntil',
    ].sort(),
  );
  assert.equal(f.query()?.status, 'approved');
  assert.equal(f.query()?.verifiedAfter, now);
});
test('current membership, active verified account and dedicated resource are rechecked', async () => {
  for (const change of ['disable', 'unverify', 'unassign', 'share'] as const) {
    const f = fixture();
    f[change]();
    assert.equal(
      (
        await f.handlers.eligibleList(
          new EligibleCredentialsQuery('operator', 'company'),
        )
      ).items.length,
      0,
    );
  }
});
test('expired or revoked credentials do not remain eligible', async () => {
  for (const status of ['revoked', 'approved'] as const) {
    const f = fixture();
    f.credential.status = status;
    f.credential.verifiedUntil = now;
    assert.equal(
      (
        await f.handlers.eligibleList(
          new EligibleCredentialsQuery('operator', 'company'),
        )
      ).items.length,
      0,
    );
  }
});
test('permission and active Colombian business are mandatory', async () => {
  const denied = fixture();
  denied.deny();
  await assert.rejects(
    denied.handlers.eligibleList(
      new EligibleCredentialsQuery('operator', 'company'),
    ),
  );
  const foreign = fixture();
  foreign.org.countryCode = 'US';
  await assert.rejects(
    foreign.handlers.eligibleList(
      new EligibleCredentialsQuery('operator', 'company'),
    ),
  );
});
