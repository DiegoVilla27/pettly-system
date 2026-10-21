import { describe, it, expect } from 'vitest';
import {
  mapPublication,
  mapPage,
  mapCandidate,
  filtersSchema,
  profileSchema,
  mapAudit,
} from './publications.mapper';
import {
  publication,
  context,
  profile,
  id,
} from '../testing/publication.fixture';
describe('Adoption publication contracts and scope', () => {
  it('projects only public snapshot fields, preserving unknown optional data', () => {
    const p = mapPublication(
      {
        ...publication,
        snapshot: {
          ...publication.snapshot,
          healthNotes: 'private',
          microchip: 'secret',
        },
      },
      context,
    );
    expect(p.snapshot).not.toHaveProperty('healthNotes');
    expect(p.snapshot).not.toHaveProperty('microchip');
    expect(p.reviewReason).toBeNull();
  });
  it('rejects foreign publication, shelter and photo identity', () => {
    expect(() =>
      mapPublication({ ...publication, organizationId: id(9) }, context),
    ).toThrow();
    expect(() =>
      mapPublication({ ...publication, id: id(9) }, context),
    ).toThrow();
    expect(() =>
      mapPublication(
        { ...publication, snapshot: { ...publication.snapshot, id: id(9) } },
        context,
      ),
    ).toThrow();
  });
  it('rejects duplicate photos and wrong pagination scope', () => {
    expect(() =>
      mapPublication(
        {
          ...publication,
          snapshot: {
            ...publication.snapshot,
            photos: [
              ...(publication.snapshot?.photos ?? []),
              ...(publication.snapshot?.photos ?? []),
            ],
          },
        },
        context,
      ),
    ).toThrow();
    expect(() =>
      mapPage(
        { items: [publication], total: 1, page: 1, limit: 20 },
        { review: false, organizationId: id(9), page: 1, limit: 20 },
      ),
    ).toThrow();
  });
  it('cannot combine moderation and operational filters', () => {
    expect(
      filtersSchema.safeParse({
        review: true,
        organizationId: id(3),
        page: 1,
        limit: 20,
      }).success,
    ).toBe(false);
    expect(
      filtersSchema.safeParse({ review: false, page: 1, limit: 20 }).success,
    ).toBe(false);
  });
  it('validates public text limits, control characters and Colombia locality', () => {
    expect(profileSchema.safeParse(profile).success).toBe(true);
    for (const p of [
      { ...profile, title: 'x' },
      { ...profile, description: 'Contains\na newline' },
      { ...profile, countryCode: 'US' },
    ])
      expect(profileSchema.safeParse(p).success).toBe(false);
  });
  it('excludes personal, foreign and unavailable animals from creation', () => {
    const a = {
      id: id(2),
      name: 'Luna',
      organizationId: id(3),
      ownerUserId: null,
      status: 'active',
    };
    expect(mapCandidate(a, id(3)).name).toBe('Luna');
    for (const p of [
      { ...a, ownerUserId: id(9) },
      { ...a, organizationId: id(9) },
      { ...a, status: 'adopted' },
    ])
      expect(() => mapCandidate(p, id(3))).toThrow();
  });
  it('validates history publication and correlation identifiers', () => {
    const event = {
      id: id(8),
      actorId: id(4),
      publicationId: id(1),
      requestId: null,
      action: 'publication.submitted',
      reason: 'Snapshot submitted for review',
      correlationId: id(10),
      createdAt: publication.createdAt,
    };
    expect(
      mapAudit({ items: [event], page: 1, limit: 20, total: 1 }, context, 1)
        .items[0]?.correlationId,
    ).toBe(id(10));
    expect(() =>
      mapAudit(
        {
          items: [{ ...event, publicationId: id(9) }],
          page: 1,
          limit: 20,
          total: 1,
        },
        context,
        1,
      ),
    ).toThrow();
  });
});
