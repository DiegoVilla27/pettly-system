import test from 'node:test';
import assert from 'node:assert/strict';
import { Email } from '../../src/shared/domain/email';
import { User } from '../../src/modules/users/domain/aggregates/user';
import { Session } from '../../src/modules/auth/domain/aggregates/session';
import { Password } from '../../src/modules/auth/domain/value-objects/password';
const now = new Date('2026-10-08T12:00:00Z');
test('email normalization and identity invariants', () => {
  assert.equal(Email.create(' Alex@Example.COM ').value, 'alex@example.com');
  assert.throws(() => Email.create('invalid'));
  const user = User.create(
    'id',
    'alex@example.com',
    { name: ' Alex ', lastName: 'Rivera' },
    now,
  );
  assert.equal(user.snapshot().name, 'Alex');
  assert.throws(() => user.updateProfile({ name: ' ' }, now));
  user.verifyEmail(now);
  user.verifyEmail(new Date(now.getTime() + 1000));
  assert.equal(user.snapshot().emailVerifiedAt?.getTime(), now.getTime());
});
test('session expiry and revocation are domain rules', () => {
  const session = Session.create('sid', 'uid', now, 60);
  session.ensureActive(now);
  assert.throws(() => session.ensureActive(new Date(now.getTime() + 60000)));
  session.revoke(now);
  assert.throws(() => session.ensureActive(now));
});
test('password bounds allow passphrases without truncation', () => {
  Password.validate('A sufficiently long passphrase');
  assert.throws(() => Password.validate('short'));
  assert.throws(() => Password.validate('x'.repeat(129)));
});
