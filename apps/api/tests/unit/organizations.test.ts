import test from 'node:test';
import assert from 'node:assert/strict';
import { Organization } from '../../src/modules/organizations/domain/aggregates/organization';
import {
  RequestOrganizationDto,
  UpdateOrganizationProfileDto,
} from '../../src/modules/organizations/adapters/in/http/dtos/requests/organization.requests';
const now = new Date('2026-10-08T10:00:00Z');
const profile = {
  legalName: 'Provider SAS',
  registrationNumber: '900.123-456',
  email: ' CONTACT@example.com ',
  phone: '+573001234567',
  countryCode: 'CO',
  city: 'Bogota',
  address: 'Calle 10 20',
};
const organization = () =>
  Organization.create('id', 'Provider', 'business', now, profile, 'applicant');
test('incomplete applications cannot activate or submit; approval does not infer responsibility', () => {
  const draft = Organization.create('id', 'Provider', 'business', now);
  assert.throws(() => draft.submit(now));
  assert.throws(() => draft.setStatus('active', now));
  const complete = organization();
  assert.equal(complete.snapshot().registrationNumber, '900123456');
  assert.equal(complete.snapshot().email, 'contact@example.com');
  complete.updateProfile({ website: 'HTTPS://EXAMPLE.COM' }, now, false);
  assert.equal(complete.snapshot().website, 'https://example.com/');
  complete.submit(now);
  assert.throws(() =>
    complete.review(true, 'admin', 'Review complete', null, now),
  );
  assert.equal(complete.snapshot().status, 'pending');
  complete.review(false, 'admin', 'Correct missing evidence', null, now);
  complete.submit(now);
  assert.equal(complete.snapshot().reviewReason, null);
  complete.review(true, 'admin', 'Review complete', 'responsible', now);
  assert.equal(complete.snapshot().status, 'active');
});
test('legal changes require renewed approval, suspended edits cannot bypass review and archive is terminal', () => {
  const org = organization();
  org.submit(now);
  org.review(true, 'admin', 'Review complete', 'responsible', now);
  org.setStatus('suspended', now);
  assert.throws(() => org.updateProfile({ city: 'Medellin' }, now, false));
  org.updateProfile({ registrationNumber: '901123456' }, now, true);
  assert.equal(org.snapshot().status, 'pending');
  assert.equal(org.snapshot().suspendedAt, null);
  assert.throws(() => org.setStatus('active', now));
  org.review(true, 'admin', 'New identity reviewed', 'responsible', now);
  org.archive(now);
  assert.equal(org.snapshot().registrationNumber, null);
  assert.equal(org.snapshot().city, null);
  assert.equal(org.snapshot().name, 'Archived organization');
  assert.throws(() => org.updateProfile({ city: 'Bogota' }, now, true));
  assert.throws(() => org.submit(now));
  assert.throws(() => org.setStatus('active', now));
  assert.equal(org.archive(now), false);
});
test('stale versions fail before updates, unchanged normalized fields preserve version and complete profiles cannot be cleared', () => {
  const org = organization();
  org.submit(now);
  org.review(true, 'admin', 'Review complete', 'responsible', now);
  const version = org.snapshot().version;
  assert.throws(() => org.expectVersion(version - 1));
  assert.equal(
    org.updateProfile({ registrationNumber: '900.123-456' }, now, false),
    false,
  );
  assert.equal(org.snapshot().version, version);
  assert.throws(() => org.updateProfile({ address: null }, now, false));
  assert.equal(org.snapshot().address, 'Calle 10 20');
});
test('organization request contracts reject privilege injection, unsafe URLs and invalid contact identities', () => {
  assert.equal(
    RequestOrganizationDto.schema.safeParse({
      name: 'Provider',
      type: 'business',
      role: 'business_admin',
    }).success,
    false,
  );
  for (const field of [
    { website: 'http://example.com' },
    { website: 'https://user:password@example.com' },
    { phone: '3001234567' },
    { countryCode: 'ZZ' },
    { registrationNumber: '--' },
  ])
    assert.equal(
      RequestOrganizationDto.schema.safeParse({
        name: 'Provider',
        type: 'business',
        profile: field,
      }).success,
      false,
    );
  assert.equal(
    UpdateOrganizationProfileDto.schema.safeParse({
      profile: {},
      reason: 'Valid administrative reason',
      expectedVersion: 1,
    }).success,
    false,
  );
  assert.equal(
    RequestOrganizationDto.schema.safeParse({
      name: 'Provider',
      type: 'business',
      profile: { legalName: 'a'.repeat(151) },
    }).success,
    false,
  );
});
