import { convertToParamMap } from '@angular/router';
import {
  mapAnimal,
  mapPage,
  mapAudit,
  profileSchema,
  parseFilters,
} from './animals.mapper';
import { animal, context, profile, id } from '../testing/animal.fixture';
describe('Shelter animal privacy and contracts', () => {
  it('rejects a personal animal or another shelter in detail even for platform staff', () => {
    expect(() =>
      mapAnimal(
        { ...animal, organizationId: null, ownerUserId: id(3) },
        context,
      ),
    ).toThrow();
    expect(() =>
      mapAnimal(animal, { ...context, organizationId: id(4) }),
    ).toThrow();
  });
  it('projects list cards without clinical notes or microchip', () => {
    const r = mapPage(
      { items: [animal], total: 1, page: 1, limit: 20 },
      { organizationId: context.organizationId, page: 1, limit: 20 },
    );
    expect(r.items[0]).not.toHaveProperty('healthNotes');
    expect(r.items[0]).not.toHaveProperty('microchip');
  });
  it('rejects foreign photos, duplicates and excessive references', () => {
    const p = {
      id: id(4),
      animalId: id(5),
      mediaId: id(6),
      position: 0,
      createdAt: animal.createdAt,
    };
    expect(() => mapAnimal({ ...animal, photos: [p] }, context)).toThrow();
    expect(() =>
      mapAnimal(
        {
          ...animal,
          photos: [
            { ...p, animalId: animal.id },
            { ...p, animalId: animal.id },
          ],
        },
        context,
      ),
    ).toThrow();
  });
  it('validates real calendar dates, future dates, grams and explicit unknown health values', () => {
    expect(profileSchema.safeParse(profile).success).toBe(true);
    expect(
      profileSchema.safeParse({ ...profile, dateOfBirth: '2023-02-29' })
        .success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...profile, dateOfBirth: '2999-01-01' })
        .success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...profile, weightGrams: 0 }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...profile, weightGrams: 1.2 }).success,
    ).toBe(false);
  });
  it('rejects invalid scope and pagination without defaulting to personal records', () => {
    expect(parseFilters(convertToParamMap({}))).toBeNull();
    expect(
      parseFilters(
        convertToParamMap({
          organizationId: context.organizationId,
          page: 'Infinity',
        }),
      ),
    ).toBeNull();
  });
  it('checks selected species/status and matching audit identity', () => {
    expect(() =>
      mapPage(
        { items: [animal], total: 1, page: 1, limit: 20 },
        {
          organizationId: context.organizationId,
          page: 1,
          limit: 20,
          species: 'cat',
        },
      ),
    ).toThrow();
    expect(() =>
      mapAudit(
        {
          items: [
            {
              id: id(4),
              actorId: id(5),
              animalId: id(6),
              action: 'animal.created',
              reason: 'Registration verified',
              requestId: id(7),
              createdAt: animal.createdAt,
            },
          ],
          page: 1,
          limit: 20,
          total: 1,
        },
        context,
        1,
      ),
    ).toThrow();
  });
  it('requires archive time exactly for archived records', () => {
    expect(() =>
      mapAnimal({ ...animal, status: 'archived' }, context),
    ).toThrow();
    expect(() =>
      mapAnimal({ ...animal, archivedAt: animal.createdAt }, context),
    ).toThrow();
  });
});
