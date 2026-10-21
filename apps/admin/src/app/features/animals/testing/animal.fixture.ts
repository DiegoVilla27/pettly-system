import type { Animal, AnimalProfile } from '../models/animal';
export const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const profile: AnimalProfile = {
  name: 'Luna',
  species: 'dog',
  breed: null,
  sex: 'female',
  size: 'medium',
  dateOfBirth: '2020-02-29',
  birthDateEstimated: true,
  weightGrams: 12345,
  color: 'Blanco',
  description: 'Animal tranquilo.',
  healthNotes: 'Control privado pendiente.',
  specialNeeds: null,
  vaccinated: null,
  neutered: false,
  microchip: 'private-123',
};
export const animal: Animal = {
  ...profile,
  id: id(1),
  ownerUserId: null,
  organizationId: id(2),
  status: 'active',
  version: 1,
  createdAt: '2026-10-08T12:00:00.000Z',
  updatedAt: '2026-10-08T12:00:00.000Z',
  archivedAt: null,
  photos: [],
};
export const context = { organizationId: id(2), animalId: id(1) };
