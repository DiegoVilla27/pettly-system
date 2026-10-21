export type {
  AnimalState as AnimalResult,
  AnimalProfile,
} from '../../domain/aggregates/animal';
export interface AnimalPhotoResult {
  id: string;
  animalId: string;
  mediaId: string;
  position: number;
  createdAt: Date;
}
export interface AnimalAudit {
  id: string;
  actorId: string;
  animalId: string;
  action: string;
  reason: string;
  requestId: string;
  createdAt: Date;
}
export interface AnimalCard {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string;
  size: string;
  dateOfBirth: string | null;
  birthDateEstimated: boolean;
  color: string | null;
  description: string | null;
  specialNeeds: string | null;
  photos: AnimalPhotoResult[];
}

export type AnimalIdentity = Pick<
  import('../../domain/aggregates/animal').AnimalState,
  'id' | 'organizationId' | 'status' | 'version'
>;
