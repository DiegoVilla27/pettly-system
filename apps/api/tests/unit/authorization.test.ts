import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_ROLES,
  MEMBERSHIP_ROLES,
  ROLE_PERMISSIONS,
  validateMembershipRole,
} from '../../src/shared/domain/authorization';
import { Organization } from '../../src/modules/organizations/domain/aggregates/organization';
import { organizationPermissionAvailable } from '../../src/modules/authorization/domain/access-policy';
import { hasPermission } from '../../src/modules/authorization/domain/access-policy';
import { AccessHandler } from '../../src/modules/authorization/application/handlers/access.handler';
import type { UsersDirectory } from '../../src/modules/users/application/ports/out/users-directory';
import { User } from '../../src/modules/users/domain/aggregates/user';
import { AssignMembershipRequestDto } from '../../src/modules/organizations/adapters/in/http/dtos/requests/organization.requests';
import { ChangeUserRoleRequestDto } from '../../src/modules/users/adapters/in/http/dtos/requests/change-user-role.request';
const now = new Date();
const user = User.create(
  'uid',
  'test@example.com',
  { name: 'Alex', lastName: 'Rivera' },
  now,
);
user.verifyEmail(now);
test('seven roles deny escalation and separate business and adoption capabilities', () => {
  assert.equal(GLOBAL_ROLES.length + MEMBERSHIP_ROLES.length, 7);
  assert.equal(user.snapshot().globalRole, 'user');
  assert.ok(hasPermission('super_admin', 'users.roles.manage'));
  for (const role of MEMBERSHIP_ROLES) {
    assert.equal(hasPermission('user', 'users.roles.manage', role), false);
    assert.equal(
      ROLE_PERMISSIONS[role].includes('organizations.members.roles.manage'),
      false,
    );
  }
  assert.equal(hasPermission('moderator', 'users.status.update'), false);
  assert.equal(
    hasPermission('user', 'animals.manage', 'business_admin'),
    false,
  );
  assert.equal(
    hasPermission('user', 'catalog.manage', 'adoption_admin'),
    false,
  );
  assert.equal(
    hasPermission('user', 'organizations.profile.update', 'business_operator'),
    false,
  );
  assert.throws(() => validateMembershipRole('adoption_admin', 'business'));
  assert.throws(() =>
    validateMembershipRole('business_admin', 'adoption_entity'),
  );
});
test('authorization resolves current membership only within the selected organization', async () => {
  let enabled = true;
  const authorization = new AccessHandler(
    {
      findById: async () =>
        enabled ? user.snapshot() : { ...user.snapshot(), status: 'disabled' },
    } as UsersDirectory,
    {
      findOrganization: async () => null,
      membershipsForUser: async () => [
        {
          id: 'mid',
          userId: 'uid',
          organizationId: 'one',
          role: 'business_admin',
          createdAt: now,
          updatedAt: now,
          organization: {
            ...Organization.create(
              'one',
              'Company',
              'business',
              now,
            ).snapshot(),
            status: 'active',
          },
        },
      ],
    },
  );
  await authorization.requirePermission('uid', 'catalog.manage', 'one');
  await assert.rejects(
    authorization.requirePermission('uid', 'catalog.manage', 'another'),
  );
  await assert.rejects(
    authorization.requirePermission('uid', 'catalog.manage'),
  );
  enabled = false;
  await assert.rejects(
    authorization.requirePermission('uid', 'catalog.manage', 'one'),
  );
});
test('role request contracts reject global/membership confusion and unknown privilege fields', () => {
  const reason = 'Reviewed and approved by platform administration.';
  assert.ok(
    ChangeUserRoleRequestDto.schema.safeParse({ role: 'moderator', reason })
      .success,
  );
  assert.equal(
    ChangeUserRoleRequestDto.schema.safeParse({
      role: 'business_admin',
      reason,
    }).success,
    false,
  );
  assert.equal(
    AssignMembershipRequestDto.schema.safeParse({ role: 'super_admin', reason })
      .success,
    false,
  );
  assert.equal(
    AssignMembershipRequestDto.schema.safeParse({
      role: 'adoption_admin',
      reason,
      permissions: ['users.roles.manage'],
    }).success,
    false,
  );
});

test('organization state and type constrain operational permissions even for platform administrators', () => {
  for (const status of [
    'draft',
    'pending',
    'rejected',
    'suspended',
    'deleted',
  ] as const)
    assert.equal(
      organizationPermissionAvailable(
        'catalog.manage',
        status,
        'business',
        true,
      ),
      false,
    );
  assert.equal(
    organizationPermissionAvailable('catalog.manage', 'active', 'business'),
    true,
  );
  assert.equal(
    organizationPermissionAvailable(
      'catalog.manage',
      'active',
      'adoption_entity',
      true,
    ),
    false,
  );
  assert.equal(
    organizationPermissionAvailable(
      'animals.manage',
      'active',
      'business',
      true,
    ),
    false,
  );
  assert.equal(
    organizationPermissionAvailable(
      'animals.manage',
      'active',
      'adoption_entity',
    ),
    true,
  );
  assert.equal(
    organizationPermissionAvailable(
      'organizations.profile.update',
      'suspended',
      'business',
    ),
    false,
  );
  assert.equal(
    organizationPermissionAvailable(
      'organizations.profile.update',
      'suspended',
      'business',
      true,
    ),
    true,
  );
  assert.equal(
    organizationPermissionAvailable(
      'organizations.profile.read',
      'deleted',
      'business',
      true,
    ),
    false,
  );
});
