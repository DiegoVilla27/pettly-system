import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  Credential,
  currentCredential,
  validateProfile,
} from '../../src/modules/veterinary/domain/credential';
import {
  CreateCredentialDto,
  ReviewCredentialDto,
} from '../../src/modules/veterinary/adapters/in/http/dtos/requests/veterinary.requests';
const now = new Date('2026-10-09T10:00:00Z'),
  profile = {
    profession: 'veterinarian' as const,
    registrationNumber: '12345',
    university: 'Veterinary University',
    consent: true,
  };
test('clinical accreditation requires complete evidence and independent expiring approval; edits remove eligibility', () => {
  const professional = randomUUID(),
    c = Credential.create(
      randomUUID(),
      randomUUID(),
      professional,
      randomUUID(),
      profile,
      now,
    );
  assert.throws(() => c.submit(now));
  for (const kind of [
    'professional_card',
    'qualification',
    'standing_certificate',
  ] as const)
    c.document(randomUUID(), kind, now);
  c.submit(now);
  assert.throws(() => c.document(randomUUID(), 'professional_card', now));
  assert.throws(() =>
    c.review(
      professional,
      true,
      new Date(+now + 86400000),
      'Official registry verification',
      now,
    ),
  );
  assert.throws(() =>
    c.review(
      randomUUID(),
      true,
      new Date(+now + 91 * 86400000),
      'Official registry verification',
      now,
    ),
  );
  c.review(
    randomUUID(),
    true,
    new Date(+now + 86400000),
    'Official registry verification',
    now,
  );
  assert.equal(currentCredential(c.snapshot(), now), true);
  assert.equal(
    currentCredential(c.snapshot(), new Date(+now + 86400000)),
    false,
  );
  c.configure(profile, now);
  assert.equal(currentCredential(c.snapshot(), now), false);
  assert.equal(c.snapshot().verifiedUntil, null);
});
test('zootecnista-only and unconsented evidence cannot authorize clinical veterinary practice', () => {
  assert.throws(() =>
    validateProfile({ ...profile, profession: 'zootechnician' as never }),
  );
  assert.throws(() => validateProfile({ ...profile, consent: false }));
  const data = {
    organizationId: randomUUID(),
    professionalId: randomUUID(),
    resourceId: randomUUID(),
    profile,
    reason: 'Verified professional evidence consent.',
  };
  assert.ok(CreateCredentialDto.schema.safeParse(data).success);
  assert.equal(
    CreateCredentialDto.schema.safeParse({ ...data, status: 'approved' })
      .success,
    false,
  );
  assert.equal(
    ReviewCredentialDto.schema.safeParse({
      approved: true,
      expectedVersion: 1,
      reason: data.reason,
      verifiedUntil: new Date(+now + 86400000).toISOString(),
      verificationReference: 'Official source checked',
      officialRegisterChecked: false,
    }).success,
    false,
  );
});
