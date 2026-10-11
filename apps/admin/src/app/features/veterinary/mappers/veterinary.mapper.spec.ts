import { convertToParamMap } from '@angular/router';
import { credentialFixture } from '../testing/credential.fixture';
import {
  mapCredential,
  mapAudit,
  mapPage,
  parseFilters,
  reviewSchema,
  localDeadline,
  validDeadline,
} from './veterinary.mapper';
describe('Veterinary boundary contracts', () => {
  it('validates nullable metadata, attachment identity and review completeness', () => {
    expect(mapCredential(credentialFixture).verificationReference).toBeNull();
    expect(() =>
      mapCredential({ ...credentialFixture, status: 'approved' }),
    ).toThrow();
    expect(() =>
      mapCredential({
        ...credentialFixture,
        documents: [
          ...credentialFixture.documents,
          ...credentialFixture.documents,
        ],
      }),
    ).toThrow();
    expect(() =>
      mapCredential(credentialFixture, credentialFixture.organizationId),
    ).toThrow();
  });
  it('rejects another credential audit and a mismatching immutable version', () => {
    const entry = {
      id: credentialFixture.professionalId,
      credentialId: credentialFixture.id,
      actorId: credentialFixture.professionalId,
      action: 'submit',
      version: 5,
      snapshot: credentialFixture,
      reason: 'Review evidence submitted',
      requestId: credentialFixture.resourceId,
      createdAt: credentialFixture.updatedAt,
    };
    expect(
      mapAudit({ items: [entry], total: 1 }, credentialFixture.id, 1).items[0]
        ?.actionLabel,
    ).toBe('Solicitud enviada');
    expect(() =>
      mapAudit(
        { items: [{ ...entry, version: 3 }], total: 1 },
        credentialFixture.id,
        1,
      ),
    ).toThrow();
    expect(() =>
      mapAudit({ items: [entry], total: 1 }, credentialFixture.resourceId, 1),
    ).toThrow();
  });
  it('rejects pretense of official attestation, stale deadlines and privilege fields', () => {
    const body = {
      approved: true,
      officialRegisterChecked: true,
      verificationReference: 'Official test reference',
      reason: 'Evidence manually reviewed',
      expectedVersion: 5,
      verifiedUntil: new Date(Date.now() + 86400000).toISOString(),
    };
    expect(reviewSchema.safeParse(body).success).toBe(true);
    for (const patch of [
      { officialRegisterChecked: false },
      { verifiedUntil: new Date(Date.now() - 1000).toISOString() },
      { verifiedUntil: new Date(Date.now() + 91 * 86400000).toISOString() },
      { globalRole: 'super_admin' },
      { verificationReference: null },
    ])
      expect(reviewSchema.safeParse({ ...body, ...patch }).success).toBe(false);
    expect(
      reviewSchema.safeParse({
        ...body,
        approved: false,
        verifiedUntil: null,
        verificationReference: null,
      }).success,
    ).toBe(true);
  });
  it('normalizes invalid URL filters and bounds queue projections', () => {
    expect(
      parseFilters(
        convertToParamMap({
          status: 'enabled',
          organizationId: 'invalid',
          page: '-1',
          limit: '100',
        }),
      ),
    ).toEqual({ page: 1, limit: 20 });
    expect(() =>
      mapPage({ items: [credentialFixture], total: 0, page: 1, limit: 20 }),
    ).toThrow();
  });
  it('uses local wall time, rejects rolled over dates and bounds recheck freshness', () => {
    expect(localDeadline('2026-02-30T10:00')).toBeNull();
    expect(localDeadline('bad')).toBeNull();
    expect(
      validDeadline('2026-10-10T10:00:00Z', Date.parse('2026-10-09T10:00:00Z')),
    ).toBe(true);
    expect(
      validDeadline('2026-10-09T10:00:00Z', Date.parse('2026-10-09T10:00:00Z')),
    ).toBe(false);
  });
});
