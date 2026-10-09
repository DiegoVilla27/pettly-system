import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CryptoEntropy,
  ArgonPasswordHasher,
} from '../../src/shared/infrastructure/security';
import { MailCipher, renderActionEmail } from '@pettly/notifications-runtime';
test('opaque tokens use sufficient entropy and stable digests', () => {
  const entropy = new CryptoEntropy(),
    one = entropy.token(),
    two = entropy.token();
  assert.equal(one.length, 43);
  assert.notEqual(one, two);
  assert.equal(entropy.digest(one).length, 64);
  assert.equal(entropy.digest(one), entropy.digest(one));
});
test('password adapter verifies Argon2id without accepting incorrect passwords', async () => {
  const passwords = new ArgonPasswordHasher();
  const hash = await passwords.hash('A sufficiently long password');
  assert.ok(hash.startsWith('$argon2id$'));
  assert.ok(await passwords.verify(hash, 'A sufficiently long password'));
  assert.equal(await passwords.verify(hash, 'wrong password'), false);
});
test('outbox ciphertext is authenticated and mail links use URL fragments', () => {
  const cipher = new MailCipher('a'.repeat(48));
  const payload = {
    id: 'id',
    to: 'alex@example.com',
    token: 'sensitive',
    purpose: 'reset' as const,
    expiresAt: new Date().toISOString(),
  };
  const encrypted = cipher.encrypt(payload);
  assert.ok(!encrypted.includes(payload.token));
  assert.deepEqual(cipher.decrypt(encrypted), payload);
  const bytes = Buffer.from(encrypted, 'base64');
  bytes[bytes.length - 1] ^= 1;
  assert.throws(() => cipher.decrypt(bytes.toString('base64')));
  assert.throws(() => new MailCipher('b'.repeat(48)).decrypt(encrypted));
  const email = renderActionEmail(payload, 'http://localhost:3001');
  assert.ok(email.text.includes('#token=sensitive'));
  assert.ok(!email.text.includes('?token='));
});
