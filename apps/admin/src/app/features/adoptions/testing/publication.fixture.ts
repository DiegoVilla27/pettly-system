import type { Publication, Profile, Context } from '../models/publication';
export const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const profile: Profile = {
  title: 'Luna busca familia',
  description: 'Compañera tranquila en busca de una familia.',
  conditions: 'Adopción responsable con seguimiento.',
  countryCode: 'CO',
  city: 'Bogotá',
};
export const publication: Publication = {
  ...profile,
  id: id(1),
  animalId: id(2),
  organizationId: id(3),
  version: 1,
  status: 'pending',
  createdBy: id(4),
  reviewedBy: null,
  reviewedAt: null,
  reviewReason: null,
  publishedAt: null,
  submittedAt: '2026-10-10T12:00:00.000Z',
  closedAt: null,
  deletedAt: null,
  createdAt: '2026-10-10T12:00:00.000Z',
  updatedAt: '2026-10-10T12:00:00.000Z',
  snapshot: {
    id: id(2),
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
        id: id(5),
        animalId: id(2),
        mediaId: id(6),
        position: 0,
        createdAt: '2026-10-10T12:00:00.000Z',
      },
    ],
  },
};
export const context: Context = {
  publicationId: id(1),
  review: false,
  organizationId: id(3),
};
