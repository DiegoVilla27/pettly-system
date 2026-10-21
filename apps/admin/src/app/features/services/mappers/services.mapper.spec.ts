import {
  profileSchema,
  copToMinor,
  mapService,
  mapPage,
  mapResources,
  minuteFromTime,
} from './services.mapper';
import { profile, service, resource } from '../testing/service.fixture';
describe('Service boundary and policy validation', () => {
  it('converts COP decimal strings exactly and rejects exponent, overflow or extra decimals', () => {
    expect(copToMinor('10000,50')).toBe(1000050);
    expect(copToMinor('0.01')).toBe(1);
    expect(copToMinor('21474836.47')).toBe(2147483647);
    for (const v of ['1e4', '-1', '0', '1.234', '21474836.48'])
      expect(copToMinor(v)).toBeNull();
  });
  it('protects scheduling, species uniqueness and clinical resource binding', () => {
    expect(profileSchema.safeParse(profile).success).toBe(true);
    for (const p of [
      { ...profile, durationMinutes: 16 },
      { ...profile, acceptedSpecies: ['dog', 'dog'] },
      { ...profile, category: 'veterinary', veterinaryCredentialId: null },
      { ...profile, resourceIds: [resource.id, resource.id] },
    ])
      expect(profileSchema.safeParse(p).success).toBe(false);
    expect(minuteFromTime('12:15')).toBe(735);
    expect(minuteFromTime('12:17')).toBeNull();
  });
  it('validates lodging and prevents cross-company or malformed response reads', () => {
    const lodging = {
      ...profile,
      category: 'lodging' as const,
      kind: 'lodging' as const,
      durationMinutes: null,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      checkInMinute: 900,
      checkOutMinute: 720,
      minNights: 1,
      maxNights: 7,
    };
    expect(profileSchema.safeParse(lodging).success).toBe(true);
    expect(
      profileSchema.safeParse({ ...lodging, checkOutMinute: 930 }).success,
    ).toBe(false);
    expect(profileSchema.safeParse({ ...lodging, minNights: 8 }).success).toBe(
      false,
    );
    expect(() => mapService(service, service.id, resource.id)).toThrow();
    expect(() =>
      mapPage(
        { items: [service], total: 1, page: 1, limit: 20 },
        1,
        20,
        undefined,
        true,
      ),
    ).toThrow();
    expect(() =>
      mapResources(
        { items: [{ ...resource, organizationId: service.id }] },
        service.organizationId,
      ),
    ).toThrow();
  });
});
