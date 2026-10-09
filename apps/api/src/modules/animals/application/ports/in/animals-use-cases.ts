import type { AnimalResult, AnimalPhotoResult } from '../../results/animal';
import type {
  CreateAnimalCommand,
  UpdateAnimalCommand,
  AnimalDecisionCommand,
  UploadAnimalPhotoCommand,
  RemoveAnimalPhotoCommand,
} from '../../commands/animal.commands';
import type {
  GetAnimalQuery,
  ListAnimalsQuery,
} from '../../queries/animal.queries';
import type { AnimalsWork } from '../out/animals-repository';
export interface AnimalsUseCases {
  create(command: CreateAnimalCommand): Promise<AnimalResult>;
  get(
    query: GetAnimalQuery,
  ): Promise<AnimalResult & { photos: AnimalPhotoResult[] }>;
  list(query: ListAnimalsQuery): ReturnType<AnimalsWork['list']>;
  update(command: UpdateAnimalCommand): Promise<AnimalResult>;
  status(command: AnimalDecisionCommand): Promise<AnimalResult>;
  upload(
    command: UploadAnimalPhotoCommand,
  ): Promise<AnimalResult & { photos: AnimalPhotoResult[] }>;
  removePhoto(command: RemoveAnimalPhotoCommand): Promise<AnimalResult>;
  photo(query: GetAnimalQuery, mediaId: string): Promise<Uint8Array>;
  audits(
    query: GetAnimalQuery,
    page: number,
    limit: number,
  ): ReturnType<AnimalsWork['audits']>;
}
export const ANIMALS_USE_CASES = Symbol('ANIMALS_USE_CASES');
