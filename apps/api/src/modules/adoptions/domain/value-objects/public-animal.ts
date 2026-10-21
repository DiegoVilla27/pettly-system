export interface PublicAnimal {
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
  photos: {
    id: string;
    animalId: string;
    mediaId: string;
    position: number;
    createdAt: Date;
  }[];
}
