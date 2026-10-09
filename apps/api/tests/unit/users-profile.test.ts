import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../../src/modules/users/domain/aggregates/user';
import { ageOn } from '../../src/shared/domain/profile-details';
import { UserResponseDto } from '../../src/modules/users/adapters/in/http/dtos/responses/user.response';
import { UserHttpMapper } from '../../src/modules/users/adapters/in/http/mappers/user-http.mapper';
import { RegisterRequestDto } from '../../src/modules/auth/adapters/in/http/dtos/requests/auth.requests';
const now = new Date('2026-10-08T12:00:00Z');
const id = '8c0a2818-b820-4f8b-82a9-1a22b5bcb921';
test('profile invariants are enforced without HTTP or Zod', () => {
  const user = User.create(
    id,
    'alex@example.com',
    { name: 'Álex', lastName: 'O’Connor', dateOfBirth: '1995-10-09' },
    now,
  );
  assert.equal(ageOn(user.snapshot().dateOfBirth ?? '', now), 30);
  assert.equal(ageOn('1995-10-08', now), 31);
  for (const changes of [
    { phone: '612345678' },
    { lastName: null },
    { countryCode: 'ZZ' },
    { dateOfBirth: '2026-02-30' },
    { dateOfBirth: '2999-01-01' },
    { dateOfBirth: '1800-01-01' },
    { name: '1234' },
    {},
  ])
    assert.throws(() => user.updateProfile(changes, now));
  assert.throws(() =>
    user.updateProfile(JSON.parse('{"globalRole":"super_admin"}'), now),
  );
  assert.equal(user.snapshot().globalRole, 'user');
  user.updateProfile({ city: ' Madrid ', phone: '+34612345678' }, now);
  user.updateProfile({ phone: null }, now);
  assert.equal(user.snapshot().city, 'Madrid');
  assert.equal(user.snapshot().phone, null);
  user.changeStatus('disabled', now);
  assert.throws(() => user.updateProfile({ city: 'Barcelona' }, now));
});
test('strict request and response DTO schemas reject privilege injection and accidental fields', () => {
  const input = {
    email: ' Alex@Example.COM ',
    name: 'Alex',
    lastName: 'Rivera',
    password: 'A sufficiently long password!',
  };
  assert.equal(
    RegisterRequestDto.schema.parse(input).email,
    'alex@example.com',
  );
  assert.equal(
    RegisterRequestDto.schema.safeParse({ ...input, globalRole: 'super_admin' })
      .success,
    false,
  );
  const user = User.create(
    id,
    input.email,
    { name: input.name, lastName: input.lastName },
    now,
  );
  const response = UserHttpMapper.response(user.snapshot(), now);
  assert.ok(UserResponseDto.schema.safeParse(response).success);
  assert.equal(
    UserResponseDto.schema.safeParse({
      ...response,
      passwordHash: 'never expose this',
    }).success,
    false,
  );
  assert.equal(
    UserResponseDto.schema.safeParse({ ...response, id: '1' }).success,
    false,
  );
});

test('deleted accounts keep UUID references but cannot regain profile, state or privileges', () => {
  const user = User.create(
    id,
    'privacy@example.com',
    { name: 'Alex', lastName: 'Rivera', phone: '+34612345678', city: 'Madrid' },
    now,
  );
  user.verifyEmail(now);
  user.grantSuperAdmin(now);
  user.changeStatus('disabled', now);
  user.updateProfileByAdministrator({ city: 'Barcelona' }, now);
  assert.equal(user.snapshot().city, 'Barcelona');
  user.anonymize(now);
  const row = user.snapshot();
  assert.equal(row.id, id);
  assert.equal(row.globalRole, 'user');
  assert.equal(row.status, 'deleted');
  assert.equal(row.phone, null);
  assert.equal(row.city, null);
  assert.equal(row.emailVerifiedAt, null);
  assert.equal(row.deletedAt, now);
  assert.throws(() => user.changeStatus('active', now));
  assert.throws(() => user.changeGlobalRole('super_admin', now));
  assert.throws(() =>
    user.updateProfileByAdministrator({ name: 'Restored' }, now),
  );
  assert.throws(() => user.verifyEmail(now));
  assert.ok(
    UserResponseDto.schema.safeParse(UserHttpMapper.response(row, now)).success,
  );
});
