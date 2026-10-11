import {
  parseFilters,
  profileChangesSchema,
  createSchema,
  responsibleSchema,
  mapMembers,
  mapAudit,
  missingProfile,
  mapProfile,
} from './organizations.mapper';
import { organizationFixture } from '../testing/organization.fixture';
const id = '9d9dc708-d471-44d8-ab8a-463c04721baf';

describe('Organization contracts', () => {
  it('normalizes URL filters and discards unsupported pagination, roles and types', () => {
    expect(
      parseFilters(
        new URLSearchParams(
          'page=-1&limit=999&type=owner&status=enabled&countryCode=XX&search=%20Sendero%20',
        ),
      ),
    ).toEqual({ page: 1, limit: 20, search: 'Sendero' });
  });
  it('rejects privilege injection and unsafe contact URLs', () => {
    expect(
      profileChangesSchema.safeParse({
        website: 'https://example.com',
        registrationNumber: '900.123-456',
        phone: '+573001234567',
        countryCode: 'CO',
      }).success,
    ).toBe(true);
    for (const value of [
      { website: 'javascript:alert(1)' },
      { website: 'https://user:secret@example.com' },
      { countryCode: 'XX' },
      { phone: '3001234567' },
      { responsibleUserId: id },
      { status: 'active' },
    ])
      expect(profileChangesSchema.safeParse(value).success).toBe(false);
    expect(
      createSchema.safeParse({
        name: 'Empresa',
        type: 'business',
        reason: 'Administrative review complete',
        responsibleUserId: id,
      }).success,
    ).toBe(false);
  });
  it('requires a version and explicit valid responsible UUID for approval', () => {
    expect(
      responsibleSchema.safeParse({
        reason: 'Administrative review complete',
        responsibleUserId: id,
      }).success,
    ).toBe(false);
    expect(
      responsibleSchema.safeParse({
        reason: 'Administrative review complete',
        responsibleUserId: id,
        expectedVersion: 2,
      }).success,
    ).toBe(true);
  });
  it('validates nullable profile fields, completeness and target identity', () => {
    expect(mapProfile(organizationFixture, id).countryCode).toBeNull();
    expect(missingProfile(organizationFixture)).toHaveLength(7);
    expect(() =>
      mapProfile(organizationFixture, '6ee2a5af-85e0-4109-b778-1d2eb73aad1c'),
    ).toThrow('validar');
  });
  it('rejects member and audit records belonging to another organization', () => {
    const page = { total: 1, page: 1, limit: 20 };
    expect(() =>
      mapMembers(
        {
          ...page,
          items: [
            {
              id,
              organizationId: '6ee2a5af-85e0-4109-b778-1d2eb73aad1c',
              userId: id,
              role: 'business_admin',
              createdAt: organizationFixture.createdAt,
              updatedAt: organizationFixture.updatedAt,
            },
          ],
        },
        id,
      ),
    ).toThrow('validar');
    expect(() =>
      mapAudit(
        {
          ...page,
          items: [
            {
              id,
              organizationId: '6ee2a5af-85e0-4109-b778-1d2eb73aad1c',
              actorId: id,
              targetUserId: null,
              action: 'organization.created',
              previousValue: null,
              nextValue: 'business',
              reason: 'Administrative review complete',
              requestId: id,
              createdAt: organizationFixture.createdAt,
            },
          ],
        },
        id,
      ),
    ).toThrow('validar');
  });
});
