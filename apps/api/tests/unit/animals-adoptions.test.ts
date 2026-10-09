import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Animal } from '../../src/modules/animals/domain/aggregates/animal';
import { Publication } from '../../src/modules/adoptions/domain/aggregates/publication';
import { AdoptionRequest } from '../../src/modules/adoptions/domain/aggregates/adoption-request';
import { SharpImageProcessor } from '../../src/modules/media/adapters/out/images/sharp-image-processor';
import {
  CreateAnimalDto,
  UpdateAnimalDto,
} from '../../src/modules/animals/adapters/in/http/dtos/requests/animal.requests';
import { SubmitAdoptionRequestDto } from '../../src/modules/adoptions/adapters/in/http/dtos/requests/adoption.requests';
const require = createRequire(new URL('../../package.json', import.meta.url));
const sharp = require('sharp');
const now = new Date('2026-10-08T10:00:00Z');
const profile = {
  name: 'Luna',
  species: 'dog' as const,
  breed: null,
  sex: 'female' as const,
  size: 'medium' as const,
  dateOfBirth: null,
  birthDateEstimated: false,
  weightGrams: null,
  color: null,
  description: null,
  healthNotes: null,
  specialNeeds: null,
  vaccinated: null,
  neutered: null,
  microchip: null,
};
const publicationProfile = {
  title: 'Luna seeks a family',
  description: 'A friendly companion ready for adoption.',
  conditions: 'An initial interview and responsible handover are required.',
  countryCode: 'CO',
  city: 'Bogota',
};
const card = {
  id: 'animal',
  name: 'Luna',
  species: 'dog',
  breed: null,
  sex: 'female',
  size: 'medium',
  dateOfBirth: null,
  birthDateEstimated: false,
  color: null,
  description: null,
  specialNeeds: null,
  photos: [
    {
      id: 'photo',
      animalId: 'animal',
      mediaId: 'media',
      position: 0,
      createdAt: now,
    },
  ],
};
test('animal ownership, private profile validation and terminal states hold independently of HTTP', () => {
  assert.throws(() => Animal.create('animal', profile, null, null, now));
  assert.throws(() => Animal.create('animal', profile, 'user', 'org', now));
  assert.throws(() =>
    Animal.create(
      'animal',
      { ...profile, dateOfBirth: '2026-02-30' },
      'user',
      null,
      now,
    ),
  );
  assert.throws(() =>
    Animal.create(
      'animal',
      { ...profile, dateOfBirth: '2027-01-01' },
      'user',
      null,
      now,
    ),
  );
  assert.throws(() =>
    Animal.create('animal', { ...profile, weightGrams: 0 }, 'user', null, now),
  );
  const personal = Animal.create('animal', profile, 'user', null, now);
  assert.throws(() => personal.adopt(now));
  assert.throws(() => personal.expectVersion(2));
  personal.status('deceased', now);
  assert.throws(() => personal.status('active', now));
  personal.status('archived', now);
  assert.throws(() => personal.update({ name: 'Changed' }, now));
  const shelter = Animal.create('animal', profile, null, 'org', now);
  shelter.adopt(now);
  assert.equal(shelter.snapshot().status, 'adopted');
  assert.throws(() => shelter.adopt(now));
});
test('publication moderation requires a photo, forbids self-review and real edits remove visibility', () => {
  const pub = Publication.create(
    'pub',
    'animal',
    'org',
    'creator',
    publicationProfile,
    now,
  );
  assert.throws(() => pub.submit({ ...card, photos: [] }, now));
  assert.throws(() =>
    pub.review(true, 'moderator', 'Verified publication', now),
  );
  pub.submit(card, now);
  assert.throws(() => pub.review(true, 'creator', 'Verified publication', now));
  pub.review(true, 'moderator', 'Verified publication', now);
  assert.equal(pub.snapshot().status, 'published');
  pub.update(
    { conditions: 'A responsible family and interview are required.' },
    now,
  );
  assert.equal(pub.snapshot().status, 'draft');
  assert.throws(() => pub.close(now));
  pub.submit(card, now);
  pub.review(true, 'moderator', 'Rechecked requirements', now);
  pub.close(now);
  assert.throws(() => pub.update({ title: 'Changed title' }, now));
});
test('application consent and explicit shelter confirmation separate interest, approval and adoption', () => {
  assert.throws(() =>
    AdoptionRequest.create(
      'id',
      'pub',
      'user',
      'A responsible adopter.',
      false,
      now,
      1,
      'Responsible adoption conditions.',
    ),
  );
  const application = AdoptionRequest.create(
    'id',
    'pub',
    'user',
    'A responsible adopter.',
    true,
    now,
    1,
    'Responsible adoption conditions.',
  );
  assert.throws(() =>
    application.complete('reviewer', 'Handover confirmed', now),
  );
  assert.throws(() =>
    application.review('approved', 'user', 'Self approved', now),
  );
  application.review('in_review', 'reviewer', 'Interview being arranged', now);
  application.review('approved', 'reviewer', 'Interview completed', now);
  assert.equal(application.snapshot().completedAt, null);
  application.withdraw(now);
  assert.throws(() =>
    application.complete('reviewer', 'Handover confirmed', now),
  );
  const selected = AdoptionRequest.create(
    'id2',
    'pub',
    'other',
    'A responsible adopter.',
    true,
    now,
    1,
    'Responsible adoption conditions.',
  );
  selected.review('approved', 'reviewer', 'Interview completed', now);
  selected.complete('reviewer', 'Handover confirmed', now);
  assert.equal(selected.snapshot().status, 'completed');
  assert.throws(() => selected.withdraw(now));
});
test('strict DTOs reject ownership/status injection and missing contact-sharing consent', () => {
  assert.equal(
    CreateAnimalDto.schema.safeParse({
      profile: { name: 'Luna', species: 'dog' },
      reason: 'Animal registered by current owner.',
      ownerUserId: 'attacker',
    }).success,
    false,
  );
  assert.equal(
    UpdateAnimalDto.schema.safeParse({
      profile: { status: 'adopted' },
      reason: 'Attempted direct adoption change.',
      expectedVersion: 1,
    }).success,
    false,
  );
  assert.equal(
    SubmitAdoptionRequestDto.schema.safeParse({
      message: 'A responsible adopter.',
      consent: false,
      expectedPublicationVersion: 1,
    }).success,
    false,
  );
});
test('adoption consent requires the exact public revision read by the applicant', () => {
  assert.equal(
    SubmitAdoptionRequestDto.schema.safeParse({
      message: 'A responsible adopter.',
      consent: true,
    }).success,
    false,
  );
  assert.equal(
    SubmitAdoptionRequestDto.schema.safeParse({
      message: 'A responsible adopter.',
      consent: true,
      expectedPublicationVersion: 1,
    }).success,
    true,
  );
});
test('image adapter rejects disguised/animated content and strips metadata while limiting output resolution', async () => {
  const processor = new SharpImageProcessor();
  await assert.rejects(
    processor.encode(Buffer.from('<svg></svg>'), 'image/png'),
  );
  await assert.rejects(
    processor.encode(Buffer.from('not an image'), 'image/jpeg'),
  );
  const input = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: '#ffaa00' },
  })
    .jpeg()
    .withExif({ IFD0: { Artist: 'Private test metadata' } })
    .toBuffer();
  await assert.rejects(processor.encode(input, 'image/png'));
  const encoded = await processor.encode(input, 'image/jpeg');
  const metadata = await sharp(Buffer.from(encoded.bytes)).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 800);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
});
