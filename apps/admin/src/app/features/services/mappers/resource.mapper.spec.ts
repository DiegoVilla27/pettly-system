import {
  resourceProfileSchema,
  calendarMinute,
  colombiaInstant,
  validAvailabilityRange,
  mapAvailability,
  mapBlock,
  colombiaToday,
} from './resource.mapper';
import { resource, service } from '../testing/service.fixture';
import type { ResourceProfile, Block } from '../models/resource';
const profile: ResourceProfile = {
  name: resource.name,
  kind: resource.kind,
  status: resource.status,
  capacity: resource.capacity,
  windows: resource.windows,
};
describe('Resource schedules and Colombia boundaries', () => {
  it('rejects overlaps, fractional capacity and invalid quarters but accepts adjacent windows and midnight closing', () => {
    expect(resourceProfileSchema.safeParse(profile).success).toBe(true);
    for (const p of [
      { ...profile, capacity: 1.5 },
      {
        ...profile,
        windows: [
          ...profile.windows,
          { day: 1, startMinute: 600, endMinute: 720 },
        ],
      },
      { ...profile, windows: [{ day: 1, startMinute: 481, endMinute: 1080 }] },
    ])
      expect(resourceProfileSchema.safeParse(p).success).toBe(false);
    expect(
      resourceProfileSchema.safeParse({
        ...profile,
        windows: [
          { day: 1, startMinute: 480, endMinute: 720 },
          { day: 1, startMinute: 720, endMinute: 1440 },
        ],
      }).success,
    ).toBe(true);
    expect(calendarMinute('24:00', true)).toBe(1440);
    expect(calendarMinute('24:00')).toBeNull();
  });
  it('requires full-day lodging and rejects duplicate days', () => {
    const p = {
      ...profile,
      kind: 'lodging',
      windows: [{ day: 1, startMinute: 0, endMinute: 1440 }],
    };
    expect(resourceProfileSchema.safeParse(p).success).toBe(true);
    expect(
      resourceProfileSchema.safeParse({
        ...p,
        windows: [...p.windows, ...p.windows],
      }).success,
    ).toBe(false);
    expect(
      resourceProfileSchema.safeParse({ ...profile, kind: 'lodging' }).success,
    ).toBe(false);
  });
  it('parses wall time in Colombia independently of browser timezone and rejects rolled dates', () => {
    expect(colombiaInstant('2026-10-12T08:15')).toBe(
      '2026-10-12T13:15:00.000Z',
    );
    expect(colombiaInstant('2026-02-30T08:15')).toBeNull();
    expect(colombiaInstant('2026-10-12T25:15')).toBeNull();
    expect(colombiaToday(Date.parse('2026-10-12T03:00:00Z'))).toBe(
      '2026-10-11',
    );
  });
  it('enforces bounded date horizons including the inclusive 31-day limit', () => {
    const now = Date.parse('2026-10-12T15:00:00Z');
    expect(validAvailabilityRange('2026-10-12', '2026-11-11', now)).toBe(true);
    for (const [from, to] of [
      ['2026-10-11', '2026-10-12'],
      ['2026-10-12', '2026-11-12'],
      ['2026-10-12', '2027-05-01'],
    ])
      expect(validAvailabilityRange(from!, to!, now)).toBe(false);
  });
  it('rejects stale versions, invented prices, impossible capacity and cross-company blocks', () => {
    const from = colombiaToday(),
      q = { resourceId: resource.id, from, to: from };
    const startsAt = colombiaInstant(from + 'T12:00')!,
      endsAt = colombiaInstant(from + 'T13:00')!;
    const dto = {
      serviceVersion: service.version,
      resourceVersion: resource.version,
      timeZone: 'America/Bogota' as const,
      truncated: false,
      slots: [
        { startsAt, endsAt, remaining: 2, totalMinor: service.priceMinor },
      ],
    };
    expect(mapAvailability(dto, service, resource, q).slots).toHaveLength(1);
    expect(() =>
      mapAvailability({ ...dto, resourceVersion: 2 }, service, resource, q),
    ).toThrow();
    for (const slot of [
      { ...dto.slots[0]!, remaining: 3 },
      { ...dto.slots[0]!, totalMinor: 1 },
    ])
      expect(() =>
        mapAvailability({ ...dto, slots: [slot] }, service, resource, q),
      ).toThrow();
    const b: Block = {
      id: service.id,
      organizationId: resource.organizationId,
      resourceId: resource.id,
      startsAt,
      endsAt,
      createdAt: startsAt,
      createdBy: service.createdBy,
      reason: 'Administrative calendar verification',
      releasedAt: null,
    };
    expect(() =>
      mapBlock(
        { ...b, organizationId: service.id },
        resource.organizationId,
        resource.id,
      ),
    ).toThrow();
  });
});
